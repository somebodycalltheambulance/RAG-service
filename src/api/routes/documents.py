import uuid
import io
import pytesseract
import PyPDF2
from PIL import Image
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.session import get_session
from src.models import Document, Chunk
from src.services.document_service import split_text
from src.services.embedding_service import get_embeddings

router = APIRouter(prefix="/documents", tags=["documents"])

# Поддерживаемые форматы файлов
SUPPORTED_TYPES = (
    "text/plain",
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
)


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
):
    if file.content_type not in SUPPORTED_TYPES:
        raise HTTPException(status_code=400, detail="Поддерживаются TXT, PDF и изображения (JPG, PNG)")

    content = await file.read()

    if file.content_type == "text/plain":
        # Декодируем текстовый файл из байтов
        text = content.decode("utf-8")

    elif file.content_type == "application/pdf":
        # Извлекаем текст со всех страниц PDF
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() or ""
        if not text.strip():
            raise HTTPException(status_code=400, detail="Текст в PDF не найден")

    else:
        # Распознаём текст с изображения через OCR
        image = Image.open(io.BytesIO(content))
        text = pytesseract.image_to_string(image, lang="rus+eng")
        if not text.strip():
            raise HTTPException(status_code=400, detail="Текст на изображении не распознан")

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