import uuid
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient


def unique_content(prefix: str = "Test") -> bytes:
    """Уникальный контент для каждого теста — избегаем 409 из-за content_hash."""
    return f"{prefix} document content {uuid.uuid4()}".encode()


async def test_health_check(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_upload_txt_document(client: AsyncClient):
    fake_embedding = [[0.0] * 384]

    with patch("src.api.routes.documents.get_embeddings", new=AsyncMock(return_value=fake_embedding)):
        response = await client.post(
            "/documents/upload",
            files={"file": ("test.txt", unique_content(), "text/plain")},
        )

    assert response.status_code == 200
    data = response.json()
    assert "document_id" in data
    assert data["filename"] == "test.txt"
    assert data["chunks_count"] >= 1


async def test_upload_duplicate_document(client: AsyncClient):
    fake_embedding = [[0.0] * 384]
    content = unique_content("Duplicate")

    with patch("src.api.routes.documents.get_embeddings", new=AsyncMock(return_value=fake_embedding)):
        r1 = await client.post(
            "/documents/upload",
            files={"file": ("dup.txt", content, "text/plain")},
        )
        assert r1.status_code == 200

        r2 = await client.post(
            "/documents/upload",
            files={"file": ("dup2.txt", content, "text/plain")},
        )
        assert r2.status_code == 409


async def test_upload_invalid_format(client: AsyncClient):
    response = await client.post(
        "/documents/upload",
        files={"file": ("test.csv", b"some content", "text/csv")},
    )
    assert response.status_code == 400


async def test_delete_document(client: AsyncClient):
    fake_embedding = [[0.0] * 384]

    with patch("src.api.routes.documents.get_embeddings", new=AsyncMock(return_value=fake_embedding)):
        upload = await client.post(
            "/documents/upload",
            files={"file": ("delete_me.txt", unique_content("Delete"), "text/plain")},
        )
    assert upload.status_code == 200
    doc_id = upload.json()["document_id"]

    response = await client.delete(f"/documents/{doc_id}")
    assert response.status_code == 200
    assert response.json()["deleted"] == doc_id


async def test_delete_nonexistent_document(client: AsyncClient):
    response = await client.delete("/documents/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404


async def test_list_documents(client: AsyncClient):
    response = await client.get("/documents/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
