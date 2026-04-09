from fastapi import FastAPI
from src.config import settings
from src.api.routes.documents import router as documents_router


app = FastAPI(
    title="RAG service",
    debug=settings.debug,
)

app.include_router(documents_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
