from datetime import datetime, timedelta, timezone

import pytest

from voice_agent.cloud_store import CloudStore


def test_cloud_queries_are_owner_and_anonymous_session_scoped(monkeypatch):
    seen = []
    session = {
        "id": "s",
        "user_id": "alice",
        "mode": "anonymous",
        "ended_at": None,
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=3)).isoformat(),
    }

    def request(self, method, path, **kwargs):
        seen.append((method, path, kwargs))
        return [session] if path == "sessions" else []

    monkeypatch.setattr(CloudStore, "_request", request)
    store = CloudStore("https://example.test", "test-key", "s")
    store.list("alice", "memories")
    assert seen[-1][2]["params"]["user_id"] == "eq.alice"
    assert seen[-1][2]["params"]["session_id"] == "eq.s"
    with pytest.raises(PermissionError):
        store.list("bob", "memories")
    with pytest.raises(ValueError):
        store.list("alice", "auth.users")
    store.close()


def test_expired_cloud_session_is_rejected(monkeypatch):
    monkeypatch.setattr(
        CloudStore,
        "_request",
        lambda *args, **kwargs: [
            {
                "user_id": "a",
                "mode": "anonymous",
                "ended_at": None,
                "expires_at": "2000-01-01T00:00:00Z",
            }
        ],
    )
    with pytest.raises(PermissionError):
        CloudStore("https://example.test", "test-key", "s")
