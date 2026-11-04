import asyncio
import time

import pytest
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from langgraph.graph import END, START, StateGraph
from pydantic import ValidationError
from typing_extensions import TypedDict

from voice_agent import api
from voice_agent.config import Settings
from voice_agent.store import Store


class State(TypedDict):
    text: str


async def test_cleanup_removes_expired_checkpoints_preserves_active(tmp_path, monkeypatch):
    store = Store(tmp_path / "store.db")
    monkeypatch.setattr(api, "store", store)
    monkeypatch.setattr(api, "locks", {})
    expired, _ = store.session()
    active, _ = store.session()
    expired_thread = f"{expired['id']}:{expired['id']}"
    active_thread = f"{active['id']}:{active['id']}"
    async with AsyncSqliteSaver.from_conn_string(str(tmp_path / "checkpoints.db")) as saver:
        builder = StateGraph(State)
        builder.add_node("echo", lambda state: state)
        builder.add_edge(START, "echo")
        builder.add_edge("echo", END)
        graph = builder.compile(checkpointer=saver)
        for thread in [expired_thread, active_thread]:
            await graph.ainvoke({"text": "private"}, {"configurable": {"thread_id": thread}})
        with store.db:
            store.db.execute(
                "UPDATE sessions SET expires_at=? WHERE id=?", (time.time() - 1, expired["id"])
            )
        api.locks[expired["id"]] = asyncio.Lock()
        await api.cleanup(saver)
        assert await saver.aget_tuple({"configurable": {"thread_id": expired_thread}}) is None
        assert await saver.aget_tuple({"configurable": {"thread_id": active_thread}}) is not None
        assert expired["id"] not in api.locks
    store.db.close()


def test_dotenv_speech_settings_and_duration_bounds(tmp_path):
    config = tmp_path / "settings.env"
    config.write_text("WHISPER_MODEL=small\nTTS_PROVIDER=gemini\nEMBEDDING_MODEL=multilingual\n")
    settings = Settings(_env_file=config)
    assert settings.whisper_model == "small"
    assert settings.tts_provider == "gemini"
    assert settings.embedding_model == "multilingual"
    with pytest.raises(ValidationError):
        Settings(_env_file=None, session_seconds=301)
