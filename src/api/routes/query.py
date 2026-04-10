from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.session import get_session
from src.services.embedding_service import get_embedding
from src.services.llm_service import generate_answer

router = APIRouter(prefix="/query", tags=["query"])


class QueryRequest(BaseModel):
    question: str
    top_k: int = 3


@router.post("/")
async def query(
    request: QueryRequest,
    session: AsyncSession = Depends(get_session),
):
    question_embedding = get_embedding(request.question)

    embedding_str = "[" + ",".join(map(str, question_embedding)) + "]"

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

    return {
        "question": request.question,
        "answer": answer,
        "chunks_used": len(chunks),
    }