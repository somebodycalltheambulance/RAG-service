from httpx import AsyncClient


async def test_health_check(client: AsyncClient):
    # Проверяем что сервис живой
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_upload_txt_document(client: AsyncClient):
    # Проверяем загрузку текстового файла
    content = b"Test document content for RAG service testing."
    response = await client.post(
        "/documents/upload",
        files={"file": ("test.txt", content, "text/plain")},
    )
    assert response.status_code == 200
    data = response.json()
    assert "document_id" in data
    assert data["filename"] == "test.txt"
    assert data["chunks_count"] >= 1


async def test_upload_invalid_format(client: AsyncClient):
    # Проверяем что неподдерживаемый формат отклоняется
    content = b"some content"
    response = await client.post(
        "/documents/upload",
        files={"file": ("test.csv", content, "text/csv")},
    )
    assert response.status_code == 400