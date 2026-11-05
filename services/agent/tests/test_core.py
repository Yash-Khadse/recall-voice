import time
from unittest.mock import AsyncMock

import pytest
from langchain_core.messages import AIMessage
from langgraph.checkpoint.memory import InMemorySaver

from voice_agent.engine import Engine, calculate, retrieve
from voice_agent.store import Store


@pytest.fixture
def store(tmp_path):
    return Store(tmp_path / "test.db")


def test_isolation_and_ownership(store):
    row = store.put("alice", "memories", {"content": "తెలుగు"})
    assert store.list("bob", "memories") == []
    assert not store.delete("bob", "memories", row["id"])
    with pytest.raises(KeyError):
        store.put("bob", "memories", {"content": "stolen"}, row["id"])
    assert store.get("alice", "memories", row["id"])["content"] == "తెలుగు"


def test_session_quota_expiry_and_cleanup(store):
    session, token = store.session(duration=10, concurrent=1)
    with pytest.raises(ValueError):
        store.session(concurrent=1)
    owner = store.authenticate(token)["owner"]
    store.put(owner, "memories", {"content": "temporary"})
    store.consume(session["id"], owner, 1)
    with pytest.raises(ValueError):
        store.consume(session["id"], owner, 1)
    store.db.execute("UPDATE sessions SET expires_at=?", (time.time() - 1,))
    with pytest.raises(PermissionError):
        store.authenticate(token)
    store.purge()
    assert not store.list(owner, "memories")


@pytest.mark.parametrize("value", ['__import__("os")', "2**100000", "[1]*100", "True", "1e300"])
def test_calculator_rejects_unsafe(value):
    with pytest.raises(ValueError):
        calculate(value)


def test_calculator():
    assert calculate("(12+3)*2-4/2") == 28


def engine(store, consent=True):
    model = AsyncMock()
    model.bind_tools = lambda _: model
    return Engine(store, "alice", "session", model, InMemorySaver(), consent=consent)


def test_memory_lifecycle(store):
    agent = engine(store)
    first = agent.execute("remember", "I prefer Hindi", key="language")["memory"]
    assert agent.execute("remember", "I prefer Hindi")["deduplicated"]
    second = agent.execute("remember", "I prefer Telugu", key="language")["memory"]
    assert first["id"] == second["id"]
    assert len(store.list("alice", "memories")) == 1
    assert agent.execute("recall", "Telugu")["matches"][0]["content"] == "I prefer Telugu"
    assert store.delete("alice", "memories", second["id"])
    assert not agent.execute("recall", "Telugu")["matches"]


def test_consent_and_sensitive_data(store):
    assert "error" in engine(store, False).execute("remember", "likes tea")
    assert "error" in engine(store).execute("remember", "password is abc")
    assert not store.list("alice", "memories")


def test_durable_reminder_and_rag(store):
    agent = engine(store)
    agent.execute("reminder", "interview", due_at="2099-01-01T10:00:00+05:30")
    assert store.list("alice", "reminders")[0]["status"] == "pending"
    with pytest.raises(ValueError):
        agent.execute("reminder", "interview", due_at="2099-01-01T10:00:00")
    store.put("alice", "documents", {"title": "policy", "content": "Refunds take 10 days"})
    assert agent.execute("search", "Refunds")["matches"][0]["title"] == "policy"
    assert not retrieve([{"content": "x" * 7000}], "x" * 7000)


async def test_graph_real_tool_loop(store):
    agent = engine(store)
    agent.model.ainvoke.side_effect = [
        AIMessage(
            content="",
            tool_calls=[
                {
                    "name": "workspace",
                    "args": {"action": "calculate", "content": "2+3"},
                    "id": "call1",
                    "type": "tool_call",
                }
            ],
        ),
        AIMessage(content="5"),
    ]
    result = await agent.chat("What is 2+3?")
    assert result["message"] == "5"
    assert result["tool_events"][0]["result"]["value"] == 5
    assert len(store.list("alice", "messages")) == 2


def test_hosted_model_validation_reports_missing_model(monkeypatch):
    import httpx

    from voice_agent.config import Settings, validate_hosted_model

    class Response:
        def raise_for_status(self):
            pass

        def json(self):
            return {"data": [{"id": "openai/gpt-oss-20b"}]}

    monkeypatch.setattr(httpx, "get", lambda *a, **k: Response())
    ok = Settings(llm_provider="groq", groq_api_key="k", llm_model="openai/gpt-oss-20b")
    assert validate_hosted_model(ok) is None
    bad = Settings(llm_provider="groq", groq_api_key="k", llm_model="llama-3.3-70b-versatile")
    assert "llama-3.3-70b-versatile" in validate_hosted_model(bad)
    assert validate_hosted_model(Settings(llm_provider="ollama")) is None


def test_failure_messages_are_specific():
    from voice_agent.worker import describe_failure

    class Err(Exception):
        def __init__(self, status):
            self.status_code = status

    assert "allowance" in describe_failure(Err(429))
    assert "misconfigured" in describe_failure(Err(404))
    assert "temporarily" in describe_failure(Err(500))


def test_groq_reasoning_effort_only_for_reasoning_models():
    from voice_agent.config import Settings, model_for

    base = {"llm_provider": "groq", "groq_api_key": "k"}
    oss = model_for(Settings(**base, llm_model="openai/gpt-oss-20b"))
    assert oss.reasoning_effort == "low"
    other = model_for(Settings(**base, llm_model="qwen/qwen3.8-27b"))
    assert other.reasoning_effort is None
