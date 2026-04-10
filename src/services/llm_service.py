import httpx
from groq import AsyncGroq
from src.config import settings

client = AsyncGroq(
    api_key=settings.groq_api_key,
    http_client=httpx.AsyncClient(proxy=settings.groq_proxy),
)


async def generate_answer(question: str, context: str) -> str:
    prompt = f"""Ответь на вопрос, используя только предоставленный контекст.
Если ответа нет в контексте — скажи об этом честно.

Контекст:
{context}

Вопрос: {question}

Ответ:"""

    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content