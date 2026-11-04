from fastapi.testclient import TestClient

from voice_agent import api
from voice_agent.store import Store


def test_api_identity_expiry_origin_and_documents(tmp_path, monkeypatch):
    monkeypatch.setattr(api, "store", Store(tmp_path / "api.db"))
    monkeypatch.setattr(api.settings, "data_dir", tmp_path)
    monkeypatch.setattr(api.settings, "max_concurrent_sessions", 10)
    with TestClient(api.app) as client:
        assert client.get("/memories").status_code == 401
        assert (
            client.post(
                "/sessions", json={}, headers={"Origin": "https://attacker.test"}
            ).status_code
            == 403
        )
        first = client.post("/sessions", json={}).json()
        second = client.post("/sessions", json={}).json()
        a = {"Authorization": "Bearer " + first["token"]}
        b = {"Authorization": "Bearer " + second["token"]}
        assert (
            client.post(
                "/chat", headers=b, json={"session_id": first["session"]["id"], "message": "steal"}
            ).status_code
            == 403
        )
        assert (
            client.post(
                "/documents", headers=a, json={"title": "Guide", "content": "నమస్కారం हिंदी English"}
            ).json()["chunks"]
            == 1
        )
        row = api.store.put(first["session"]["id"], "memories", {"content": "private"})
        assert client.get("/memories", headers=b).json() == {"memories": []}
        assert (
            client.request("DELETE", "/memories", headers=b, json={"id": row["id"]}).status_code
            == 404
        )
        assert (
            client.patch(
                "/memories", headers=a, json={"id": row["id"], "content": "corrected"}
            ).status_code
            == 200
        )
        assert client.delete("/sessions", headers=a).status_code == 200
        assert client.get("/memories", headers=a).status_code == 401


def test_local_key_required_for_persistence(tmp_path, monkeypatch):
    monkeypatch.setattr(api, "store", Store(tmp_path / "local.db"))
    monkeypatch.setattr(api.settings, "data_dir", tmp_path)
    monkeypatch.setattr(api.settings, "local_api_key", "local-secret")
    with TestClient(api.app) as client:
        assert (
            client.post("/sessions", json={}, headers={"X-Local-Key": "wrong"}).status_code == 401
        )
        session = client.post("/sessions", json={}, headers={"X-Local-Key": "local-secret"}).json()
        assert session["session"]["mode"] == "authenticated"
        auth = {"Authorization": "Bearer " + session["token"]}
        api.store.put("local-owner", "memories", {"content": "persistent"})
        client.delete("/sessions", headers=auth)
        new = client.post("/sessions", json={}, headers={"X-Local-Key": "local-secret"}).json()
        assert (
            client.get("/memories", headers={"Authorization": "Bearer " + new["token"]}).json()[
                "memories"
            ][0]["content"]
            == "persistent"
        )
