import pytest
from httpx import AsyncClient, ASGITransport
from src.main import app
from src.database.session import engine


@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client


@pytest.fixture(autouse=True)
async def reset_connection_pool():
    """Сбрасываем пул соединений после каждого теста, чтобы не было stale-соединений."""
    yield
    await engine.dispose()
