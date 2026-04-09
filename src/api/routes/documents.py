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
    if file.content_type not in ("text/plain", "application/pdf"):
        raise HTTPException(status_code=400, detail="Только TXT и PDF файлы")

    content = await file.read()

    if file.content_type == "text/plain":
        text = content.decode("utf-8")
    else:
        raise HTTPException(status_code=400, detail="PDF пока не поддерживается")

    document = Document(
        id=uuid.uuid4(),
        filename=file.filename,
        content=text,
    )
    session.add(document)

    chunks = split_text(text)
    embeddings = get_embeddings(chunks)

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