import hashlib
import json
from redis.asyncio import Redis
from src.config import settings

redis = Redis.from_url(settings.redis_url)


def _make_key(raw: str) -> str:
    normalized = raw.strip().lower()
    return "query:" + hashlib.md5(normalized.encode()).hexdigest()


async def get_cached(question: str) -> str | None:
    key = _make_key(question)
    value = await redis.get(key)
    if value:
        return json.loads(value)
    return None


async def set_cached(question: str, answer: str, ttl: int = 3600) -> None:
    key = _make_key(question)
    await redis.set(key, json.dumps(answer), ex=ttl)