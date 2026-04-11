import asyncio
from functools import partial
from sentence_transformers import SentenceTransformer
from typing import List

_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


async def get_embedding(text: str) -> List[float]:
    model = _get_model()
    embedding = await asyncio.to_thread(
        partial(model.encode, text, normalize_embeddings=True)
    )
    return embedding.tolist()


async def get_embeddings(texts: List[str]) -> List[List[float]]:
    model = _get_model()
    embeddings = await asyncio.to_thread(
        partial(model.encode, texts, normalize_embeddings=True)
    )
    return embeddings.tolist()