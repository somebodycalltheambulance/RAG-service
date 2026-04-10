from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.session import get_session
from src.services.embedding_service import get_embedding
from src.services.llm_service import generate_answer
from src.services.cache_service import get_cached, set_cached
from typing import Optional

router = APIRouter(prefix="/query", tags=["query"])


class QueryRequest(BaseModel):
    question: str
    top_k: int = 3
    document_id: Optional[str] = None  # Опциональная фильтрация по документу


@router.post("/")
async def query(
    request: QueryRequest,
    session: AsyncSession = Depends(get_session),
):
    # Проверяем кеш — ключ включает document_id если указан
    cache_key = request.question + (request.document_id or "")
    cached = await get_cached(cache_key)
    if cached:
        return {
            "question": request.question,
            "answer": cached,
            "chunks_used": 0,
            "cached": True,
        }

    question_embedding = get_embedding(request.question)
    embedding_str = "[" + ",".join(map(str, question_embedding)) + "]"

    # Если указан document_id — ищем только по его чанкам
    if request.document_id:
        result = await session.execute(
            text(
                f"""
                SELECT content
                FROM chunks
                WHERE document_id = :document_id
                ORDER BY embedding <=> '{embedding_str}'::vector
                LIMIT :top_k
                """
            ),
            {"top_k": request.top_k, "document_id": request.document_id},
        )
    else:
        result = await session.execute(
            text(
                f"""
                SELECT content
                FROM chunks
                ORDER BY embedding <=> '{embedding_str}'::vector
                LIMIT :top_k
                """
            ),
            {"top_k": request.top_k},
        )

    chunks = result.fetchall()

    if not chunks:
        raise HTTPException(status_code=404, detail="Документы не найдены")

    context = "\n\n".join([row[0] for row in chunks])
    answer = await generate_answer(request.question, context)

    await set_cached(cache_key, answer)

    return {
        "question": request.question,
        "answer": answer,
        "chunks_used": len(chunks),
        "cached": False,
    }