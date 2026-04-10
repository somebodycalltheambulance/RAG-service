import pytest
from httpx import AsyncClient, ASGITransport
from src.main import app


@pytest.fixture
async def client():
    # Создаём тестовый HTTP-клиент который ходит напрямую в приложение
    # без реального сетевого соединения
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client