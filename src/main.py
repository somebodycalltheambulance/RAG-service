from fastapi import FastAPI
from src.config import settings

app = FastAPI(
    title="RAG service",
    debug=settings.debug,
)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
