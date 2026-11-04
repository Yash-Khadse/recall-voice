"""Optional local multilingual semantic embeddings. No paid embedding API."""

import math
from functools import lru_cache

from .config import Settings


@lru_cache(maxsize=1)
def model():
    name = Settings().embedding_model
    if not name:
        return None
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(name, device="cpu", trust_remote_code=False)


def embed(text):
    encoder = model()
    if encoder is None:
        return None
    vector = encoder.encode(text, normalize_embeddings=True).tolist()
    if len(vector) != 384:
        raise ValueError("The configured embedding model must produce 384 dimensions")
    return vector


def cosine(left, right):
    denominator = math.sqrt(sum(x * x for x in left) * sum(x * x for x in right))
    return sum(x * y for x, y in zip(left, right, strict=True)) / denominator if denominator else 0


def search(store, owner, kind, query):
    from .engine import retrieve

    vector = embed(query)
    if vector is None:
        return retrieve(store.list(owner, kind), query), "lexical"
    if hasattr(store, "semantic_search"):
        return store.semantic_search(owner, kind, vector), "semantic"
    records = store.list(owner, kind)
    scored = []
    for record in records:
        stored = record.get("embedding") or embed(record["content"])
        score = cosine(vector, stored)
        if score > 0.2:
            scored.append((score + 0.05 * record.get("importance", 0.5), record))
    result, budget = [], 6000
    for _, record in sorted(scored, key=lambda item: item[0], reverse=True)[:8]:
        if len(record["content"]) <= budget:
            result.append({key: value for key, value in record.items() if key != "embedding"})
            budget -= len(record["content"])
    return result, "semantic"
