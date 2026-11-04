"""Loopback-only local service. Never expose this service directly to the internet."""

import asyncio
import hmac
import time
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Literal

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from pydantic import BaseModel, Field

from .config import Settings, model_for
from .engine import Engine
from .store import Store

settings = Settings()
settings.data_dir.mkdir(parents=True, exist_ok=True)
store = Store(settings.data_dir / "recall.db")
locks: dict[str, asyncio.Lock] = {}


async def cleanup(saver):
    with store.lock, store.db:
        active = {
            f"{row['owner']}:{row['id']}"
            for row in store.db.execute(
                "SELECT owner,id FROM sessions WHERE expires_at>?", (time.time(),)
            )
        }
        store.purge()
    async with saver.conn.execute("SELECT DISTINCT thread_id FROM checkpoints") as cursor:
        threads = await cursor.fetchall()
    for (thread,) in threads:
        session_id = thread.rsplit(":", 1)[-1]
        lock = locks.get(session_id)
        if thread not in active and not (lock and lock.locked()):
            await saver.adelete_thread(thread)
    for session_id, lock in list(locks.items()):
        if not lock.locked() and not any(t.endswith(":" + session_id) for t in active):
            locks.pop(session_id, None)


async def cleanup_loop(saver):
    while True:
        await cleanup(saver)
        await asyncio.sleep(10)


@asynccontextmanager
async def lifespan(app):
    async with AsyncSqliteSaver.from_conn_string(
        str(settings.data_dir / "checkpoints.db")
    ) as saver:
        app.state.saver = saver
        await saver.setup()
        task = asyncio.create_task(cleanup_loop(saver))
        try:
            yield
        finally:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
            await cleanup(saver)


app = FastAPI(title="Recall Voice local API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-Local-Key"],
)


@app.middleware("http")
async def boundaries(request: Request, call_next):
    from fastapi.responses import JSONResponse

    origin = request.headers.get("origin")
    if origin and origin not in settings.allowed_origins.split(","):
        return JSONResponse({"detail": "Origin not allowed"}, status_code=403)
    limit = 3_000_000 if request.url.path == "/transcribe" else 65536
    try:
        length = int(request.headers.get("content-length", "0"))
    except ValueError:
        return JSONResponse({"detail": "Invalid content length"}, status_code=400)
    if length > limit:
        return JSONResponse({"detail": "Request too large"}, status_code=413)
    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        received = bytearray()
        async for chunk in request.stream():
            received.extend(chunk)
            if len(received) > limit:
                return JSONResponse({"detail": "Request too large"}, status_code=413)
        request._body = bytes(received)
    return await call_next(request)


def identity(authorization: str = Header(default="")):
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Start a session first")
    try:
        return store.authenticate(authorization[7:])
    except PermissionError as error:
        raise HTTPException(401, str(error)) from error


class SessionInput(BaseModel):
    language: Literal["auto", "en", "hi", "te"] = "auto"
    memoryConsent: bool = False


class ChatInput(BaseModel):
    session_id: str
    message: str = Field(min_length=1, max_length=4000)
    language: Literal["auto", "en", "hi", "te"] = "auto"


class MemoryEdit(BaseModel):
    id: str
    content: str = Field(min_length=1, max_length=4000)


class DeleteInput(BaseModel):
    id: str


class Preferences(BaseModel):
    language: Literal["auto", "en", "hi", "te"] = "auto"
    memoryConsent: bool = False
    theme: Literal["light", "dark", "system"] = "system"
    voicePreference: str = Field(default="browser", max_length=100)


@app.get("/health")
async def health():
    available = bool(
        settings.groq_api_key if settings.llm_provider == "groq" else settings.google_api_key
    )
    if settings.llm_provider == "ollama":
        try:
            async with httpx.AsyncClient(timeout=2) as client:
                response = await client.get(settings.ollama_base_url + "/api/tags")
                available = any(
                    m["name"] == settings.llm_model for m in response.json().get("models", [])
                )
        except (httpx.HTTPError, ValueError, KeyError):
            available = False
    return {
        "configured": available,
        "mode": "local",
        "voiceVerified": False,
        "message": "Local model ready."
        if available
        else "Local model is unavailable. Install Ollama and pull the configured model.",
    }


@app.post("/sessions")
async def session(body: SessionInput, x_local_key: str = Header(default="")):
    persistent = bool(
        settings.local_api_key and hmac.compare_digest(x_local_key, settings.local_api_key)
    )
    if x_local_key and not persistent:
        raise HTTPException(401, "Invalid local key")
    try:
        info, token = store.session(
            settings.session_seconds, persistent, settings.max_concurrent_sessions
        )
    except ValueError as error:
        raise HTTPException(429, str(error)) from error
    owner = "local-owner" if persistent else info["id"]
    store.preferences(
        owner,
        {
            "language": body.language,
            "memory_consent": body.memoryConsent,
            "memoryConsent": body.memoryConsent,
        },
    )
    return {"session": info, "token": token}


@app.delete("/sessions")
async def end_session(user=Depends(identity)):
    with store.lock, store.db:
        store.db.execute("UPDATE sessions SET expires_at=0 WHERE id=?", (user["id"],))
        store.purge()
    await cleanup(app.state.saver)
    return {"ended": True}


@app.post("/chat")
async def chat(body: ChatInput, user=Depends(identity)):
    if body.session_id != user["id"]:
        raise HTTPException(403, "Session mismatch")
    lock = locks.setdefault(user["id"], asyncio.Lock())
    if lock.locked():
        raise HTTPException(409, "A response is already in progress")
    async with lock:

        async def consume():
            store.consume(user["id"], user["owner"], settings.max_session_requests)

        try:
            engine = Engine(
                store,
                user["owner"],
                user["id"],
                model_for(settings),
                app.state.saver,
                consent=store.preferences(user["owner"]).get("memoryConsent", False),
                consume=consume,
            )
            return await asyncio.wait_for(engine.chat(body.message, body.language), timeout=90)
        except ValueError as error:
            raise HTTPException(429, str(error)) from error
        except Exception as error:
            # Do not expose provider payloads, tokens, or personal prompt text.
            status = 429 if getattr(error, "status_code", 0) == 429 else 503
            raise HTTPException(
                status,
                "Provider quota exhausted."
                if status == 429
                else "The model is unavailable. Check the local server or provider configuration.",
            ) from error


@app.get("/memories")
async def memories(user=Depends(identity)):
    return {"memories": store.list(user["owner"], "memories")}


@app.patch("/memories")
async def edit_memory(body: MemoryEdit, user=Depends(identity)):
    record = store.get(user["owner"], "memories", body.id)
    if not record:
        raise HTTPException(404, "Memory not found")
    return {
        "memory": store.put(
            user["owner"],
            "memories",
            {**record, "content": body.content, "source": "user_edit", "embedding": None},
            body.id,
        )
    }


@app.delete("/memories")
async def delete_memory(body: DeleteInput, user=Depends(identity)):
    if not store.delete(user["owner"], "memories", body.id):
        raise HTTPException(404, "Memory not found")
    return {"deleted": True}


@app.get("/history")
async def history(user=Depends(identity)):
    return store.history(user["owner"])


@app.get("/settings")
async def get_settings(user=Depends(identity)):
    return store.preferences(user["owner"])


@app.put("/settings")
async def put_settings(body: Preferences, user=Depends(identity)):
    return store.preferences(user["owner"], body.model_dump())


class DocumentInput(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=16000)


@app.post("/documents")
async def document(body: DocumentInput, user=Depends(identity)):
    records = []
    for index in range(0, len(body.content), 1000):
        records.append(
            store.put(
                user["owner"],
                "documents",
                {
                    "title": body.title,
                    "content": body.content[index : index + 1200],
                    "session_id": user["id"],
                },
            )
        )
    return {"chunks": len(records)}


@app.get("/records")
async def records(user=Depends(identity)):
    return {kind: store.list(user["owner"], kind) for kind in ["notes", "tasks", "reminders"]}


@app.get("/reminders/due")
async def due_reminders(user=Depends(identity)):
    now = datetime.now(UTC)
    return {
        "reminders": [
            r
            for r in store.list(user["owner"], "reminders")
            if r.get("status") == "pending" and datetime.fromisoformat(r["due_at"]) <= now
        ]
    }


class RecordEdit(BaseModel):
    kind: Literal["notes", "tasks", "reminders"]
    id: str
    content: str | None = Field(default=None, min_length=1, max_length=4000)
    status: Literal["pending", "done", "delivered"] | None = None


@app.patch("/records")
async def update_record(body: RecordEdit, user=Depends(identity)):
    row = store.get(user["owner"], body.kind, body.id)
    if not row:
        raise HTTPException(404, "Record not found")
    allowed = {"notes": [], "tasks": ["pending", "done"], "reminders": ["pending", "delivered"]}
    if body.status and body.status not in allowed[body.kind]:
        raise HTTPException(400, "Invalid record status")
    patch = body.model_dump(exclude_none=True, exclude={"id", "kind"})
    return {"record": store.put(user["owner"], body.kind, {**row, **patch}, body.id)}


@app.delete("/records")
async def delete_record(body: RecordEdit, user=Depends(identity)):
    if not store.delete(user["owner"], body.kind, body.id):
        raise HTTPException(404, "Record not found")
    return {"deleted": True}


@app.post("/transcribe")
async def transcribe(
    request: Request, language: Literal["auto", "en", "hi", "te"] = "auto", user=Depends(identity)
):
    from .local_speech import transcribe as recognize

    try:
        store.consume(user["id"], user["owner"], settings.max_session_requests)
        audio = await request.body()
        if len(audio) > 3_000_000:
            raise HTTPException(413, "Audio clip exceeds 3 MB")
        return await asyncio.to_thread(recognize, audio, language)
    except ImportError as error:
        raise HTTPException(
            503, "Local speech is not installed. Run uv sync --extra local-speech."
        ) from error
    except HTTPException:
        raise
    except ValueError as error:
        raise HTTPException(429, str(error)) from error
    except Exception as error:
        raise HTTPException(
            503, "Local transcription failed. Check the model download and audio format."
        ) from error
