from sentence_transformers import SentenceTransformer
from typing import List

model = SentenceTransformer("all-MiniLM-L6-v2")


def get_embedding(text: str) -> List[float]:
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()


def get_embeddings(texts: List[str]) -> List[List[float]]:
    embeddings = model.encode(texts, normalize_embeddings=True)
    return embeddings.tolist()