from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient

from src.main import app
from src.database.session import get_session


def make_session_mock(rows):
    """Создаёт мок AsyncSession, чей execute().fetchall() вернёт rows."""
    mock_result = MagicMock()
    mock_result.fetchall.return_value = rows

    mock_session = AsyncMock()
    mock_session.execute.return_value = mock_result
    return mock_session


def session_override(session_mock):
    """Возвращает async-генератор для подмены get_session."""
    async def _override():
        yield session_mock
    return _override


async def test_query_returns_answer(client: AsyncClient):
    fake_embedding = [0.0] * 384
    session_mock = make_session_mock([("Тестовый контекст",)])

    app.dependency_overrides[get_session] = session_override(session_mock)
    try:
        with (
            patch("src.api.routes.query.get_embedding", new=AsyncMock(return_value=fake_embedding)),
            patch("src.api.routes.query.get_cached", new=AsyncMock(return_value=None)),
            patch("src.api.routes.query.set_cached", new=AsyncMock()),
            patch("src.api.routes.query.generate_answer", new=AsyncMock(return_value="Тестовый ответ")),
        ):
            response = await client.post("/query/", json={"question": "Что такое RAG?"})
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert data["question"] == "Что такое RAG?"
    assert data["answer"] == "Тестовый ответ"
    assert data["cached"] is False
    assert data["chunks_used"] == 1


async def test_query_cache_hit(client: AsyncClient):
    with patch("src.api.routes.query.get_cached", new=AsyncMock(return_value="Кешированный ответ")):
        response = await client.post("/query/", json={"question": "Что такое RAG?"})

    assert response.status_code == 200
    data = response.json()
    assert data["cached"] is True
    assert data["answer"] == "Кешированный ответ"
    assert data["chunks_used"] == 0


async def test_query_no_documents(client: AsyncClient):
    fake_embedding = [0.0] * 384
    session_mock = make_session_mock([])

    app.dependency_overrides[get_session] = session_override(session_mock)
    try:
        with (
            patch("src.api.routes.query.get_embedding", new=AsyncMock(return_value=fake_embedding)),
            patch("src.api.routes.query.get_cached", new=AsyncMock(return_value=None)),
        ):
            response = await client.post("/query/", json={"question": "Что такое RAG?"})
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 404


async def test_query_with_document_id(client: AsyncClient):
    fake_embedding = [0.0] * 384
    doc_id = "00000000-0000-0000-0000-000000000001"
    session_mock = make_session_mock([("Контекст документа",)])

    app.dependency_overrides[get_session] = session_override(session_mock)
    try:
        with (
            patch("src.api.routes.query.get_embedding", new=AsyncMock(return_value=fake_embedding)),
            patch("src.api.routes.query.get_cached", new=AsyncMock(return_value=None)),
            patch("src.api.routes.query.set_cached", new=AsyncMock()),
            patch("src.api.routes.query.generate_answer", new=AsyncMock(return_value="Ответ по документу")),
        ):
            response = await client.post(
                "/query/",
                json={"question": "Что такое RAG?", "document_id": doc_id},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["answer"] == "Ответ по документу"


async def test_cache_key_normalization():
    """Одинаковый вопрос в разном регистре/пробелах даёт одинаковый ключ."""
    from src.services.cache_service import _make_key

    assert _make_key("  Что такое RAG?  ") == _make_key("что такое rag?")
    assert _make_key("Привет") == _make_key("  привет  ")
