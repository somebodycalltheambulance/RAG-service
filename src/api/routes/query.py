from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.session import get_session
from src.services.embedding_service import get_embedding
from src.services.llm_service import generate_answer
from src.services.cache_service import get_cached, set_cached

router = APIRouter(prefix="/query", tags=["query"])


class QueryRequest(BaseModel):
    question: str
    top_k: int = 3  # Количество релевантных чанков для передачи в LLM


@router.post("/")
async def query(
    request: QueryRequest,
    session: AsyncSession = Depends(get_session),
):
    # Проверяем кеш — если такой вопрос уже задавали, возвращаем готовый ответ
    cached = await get_cached(request.question)
    if cached:
        return {
            "question": request.question,
            "answer": cached,
            "chunks_used": 0,
            "cached": True,
        }

    # Превращаем вопрос в вектор для семантического поиска
    question_embedding = get_embedding(request.question)
    embedding_str = "[" + ",".join(map(str, question_embedding)) + "]"

    # Ищем top_k наиболее похожих чанков по косинусному расстоянию (оператор <=>)
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

    # Склеиваем чанки в единый контекст для LLM
    context = "\n\n".join([row[0] for row in chunks])
    answer = await generate_answer(request.question, context)

    # Сохраняем ответ в кеш на следующие запросы
    await set_cached(request.question, answer)

    return {
        "question": request.question,
        "answer": answer,
        "chunks_used": len(chunks),
        "cached": False,
    }