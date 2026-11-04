from voice_agent.embeddings import cosine, search
from voice_agent.metrics import Metrics
from voice_agent.store import Store


def test_semantic_ranking_and_no_cross_owner(tmp_path, monkeypatch):
    store = Store(tmp_path / "semantic.db")
    store.put(
        "a",
        "memories",
        {"content": "enjoys automobiles", "embedding": [1.0, 0.0], "importance": 0.5},
    )
    store.put("a", "memories", {"content": "likes cooking", "embedding": [0.0, 1.0]})
    store.put("b", "memories", {"content": "private cars", "embedding": [1.0, 0.0]})
    monkeypatch.setattr("voice_agent.embeddings.embed", lambda _: [1.0, 0.0])
    results, mode = search(store, "a", "memories", "vehicles")
    assert mode == "semantic"
    assert [r["content"] for r in results] == ["enjoys automobiles"]
    assert cosine([0, 0], [1, 0]) == 0


def test_percentiles_are_measured_not_constants():
    metrics = Metrics()
    for value in range(1, 101):
        metrics.observe("test", value)
    assert metrics.summary()["test"] == {"count": 100, "p50_ms": 50, "p95_ms": 95}
