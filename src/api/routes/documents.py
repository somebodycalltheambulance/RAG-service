import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.session import get_session
from src.models import Document, Chunk
from src.services.document_service import split_text
from src.services.embedding_service import get_embeddings

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
):
    # Принимаем только текстовые файлы и PDF
    if file.content_type not in ("text/plain", "application/pdf"):
        raise HTTPException(status_code=400, detail="Только TXT и PDF файлы")

    # Читаем содержимое файла в байтах
    content = await file.read()

    # Декодируем текст из байтов
    if file.content_type == "text/plain":
        text = content.decode("utf-8")
    else:
        # PDF-парсинг будет добавлен позже
        raise HTTPException(status_code=400, detail="PDF пока не поддерживается")

    # Создаём запись документа в БД
    document = Document(
        id=uuid.uuid4(),
        filename=file.filename,
        content=text,
    )
    session.add(document)

    # Нарезаем текст на чанки и генерируем эмбеддинги для всех сразу
    chunks = split_text(text)
    embeddings = get_embeddings(chunks)

    # Сохраняем каждый чанк с его эмбеддингом
    for i, (chunk_text, embedding) in enumerate(zip(chunks, embeddings)):
        chunk = Chunk(
            id=uuid.uuid4(),
            document_id=document.id,
            content=chunk_text,
            chunk_index=i,
            embedding=embedding,
        )
        session.add(chunk)

    await session.commit()

    return {
        "document_id": str(document.id),
        "filename": file.filename,
        "chunks_count": len(chunks),
    }
    
@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    session: AsyncSession = Depends(get_session),
):
    # Ищем документ по ID
    document = await session.get(Document, uuid.UUID(document_id))

    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")

    # Удаляем документ — чанки удалятся каскадно
    await session.delete(document)
    await session.commit()

    return {"deleted": document_id}