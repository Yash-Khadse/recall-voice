"""Service-role access is always narrowed to a validated identity and session."""

from datetime import UTC, datetime

import httpx


class CloudStore:
    def __init__(self, url, key, session_id):
        self.client = httpx.Client(
            base_url=url.rstrip("/") + "/rest/v1/",
            timeout=15,
            headers={
                "apikey": key,
                "Authorization": "Bearer " + key,
                "Prefer": "return=representation",
            },
        )
        self.session_id = session_id
        rows = self._request("GET", "sessions", params={"id": "eq." + session_id, "select": "*"})
        if len(rows) != 1:
            raise PermissionError("Unknown session")
        self.session = rows[0]
        self.owner = self.session["user_id"]
        self.validate()

    def _request(self, method, path, **kwargs):
        response = self.client.request(method, path, **kwargs)
        response.raise_for_status()
        return response.json() if response.content else None

    def validate(self):
        rows = self._request(
            "GET",
            "sessions",
            params={
                "id": "eq." + self.session_id,
                "user_id": "eq." + self.session["user_id"],
                "select": "*",
            },
        )
        if (
            not rows
            or rows[0]["ended_at"]
            or datetime.fromisoformat(rows[0]["expires_at"].replace("Z", "+00:00"))
            <= datetime.now(UTC)
        ):
            raise PermissionError("Session expired")
        return rows[0]

    def scope(self, owner):
        if owner != self.owner:
            raise PermissionError("Owner mismatch")
        params = {"user_id": "eq." + self.owner}
        if self.session["mode"] == "anonymous":
            params["session_id"] = "eq." + self.session_id
        return params

    def list(self, owner, kind):
        if kind not in ("memories", "notes", "tasks", "reminders", "messages", "documents"):
            raise ValueError("Invalid record category")
        return self._request(
            "GET",
            kind,
            params={**self.scope(owner), "select": "*", "order": "created_at.desc", "limit": "200"},
        )

    def get(self, owner, kind, record_id):
        return next((r for r in self.list(owner, kind) if r["id"] == record_id), None)

    def put(self, owner, kind, data, record_id=None):
        self.validate()
        params = self.scope(owner)
        allowed = {
            "memories": (
                "content",
                "type",
                "confidence",
                "importance",
                "source",
                "key",
                "embedding",
            ),
            "messages": ("content", "role"),
            "notes": ("content",),
            "tasks": ("content", "status"),
            "reminders": ("content", "due_at", "status"),
            "documents": ("title", "content", "embedding"),
        }
        if kind not in allowed:
            raise ValueError("Invalid record category")
        payload = {key: value for key, value in data.items() if key in allowed[kind]}
        if record_id:
            rows = self._request(
                "PATCH", kind, params={**params, "id": "eq." + record_id}, json=payload
            )
            if not rows:
                raise KeyError("Record not found")
        else:
            payload.update(user_id=self.owner, session_id=self.session_id)
            rows = self._request("POST", kind, json=payload)
        return rows[0]

    async def consume(self):
        import asyncio

        result = await asyncio.to_thread(
            self._request,
            "POST",
            "rpc/consume_provider_budget",
            json={"p_session_id": self.session_id, "p_requests": 1},
        )
        if not result:
            raise ValueError("Session or provider budget exhausted")

    def semantic_search(self, owner, kind, vector):
        self.scope(owner)
        # Index previously ingested/edited rows with the same configured local model.
        from .embeddings import embed

        for row in self.list(owner, kind):
            if not row.get("embedding"):
                self.put(owner, kind, {"embedding": embed(row["content"])}, row["id"])
        found = self._request(
            "POST",
            "rpc/worker_search",
            json={
                "p_user_id": self.owner,
                "p_session_id": self.session_id,
                "p_kind": kind,
                "p_vector": vector,
            },
        )
        result, budget = [], 6000
        for row in found:
            if len(row["content"]) <= budget:
                result.append(row)
                budget -= len(row["content"])
        return result

    def close(self):
        self.client.close()
