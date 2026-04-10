# RAG Service

REST API сервис для вопрос-ответа по загруженным документам на основе RAG (Retrieval-Augmented Generation).

## Стек

- **FastAPI** - REST API
- **PostgreSQL + pgvector** — хранение документов и векторный поиск
- **Redis** - кеширование ответов
- **sentence-transformers** — генерация эмбеддингов (all-MiniLM-L6-v2)
- **Groq** - генерация ответов (llama-3.3-70b-versatile)
- **Docker** - контейнеризация инфраструктуры

## Как работает

1. Загружаешь документ через `/documents/upload`
2. Сервис нарезает текст на чанки и генерирует эмбеддинги
3. Задаёшь вопрос через `/query/`
4. Сервис ищет релевантные чанки по векторному сходству
5. Передаёт контекст в LLM и возвращает ответ

## Запуск

### 1. Клонируй репозиторий

```bash
git clone https://github.com/somebodycalltheambulance/rag-service.git
cd rag-service
```

### 2. Настрой окружение

```bash
cp .env.example .env
# Заполни GROQ_API_KEY в .env
```

### 3. Подними инфраструктуру

```bash
docker compose up -d
```

### 4. Установи зависимости и примени миграции

```bash
uv sync
uv run alembic upgrade head
```

### 5. Запусти сервер

```bash
uv run uvicorn src.main:app --reload
```

## API

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/health` | Проверка доступности сервиса |
| POST | `/documents/upload` | Загрузка документа (TXT) |
| POST | `/query/` | Вопрос по загруженным документам |

### Примеры

**Загрузка документа:**
```bash
curl -X POST http://localhost:8000/documents/upload \
  -F "file=@document.txt"
```

**Вопрос:**
```bash
curl -X POST http://localhost:8000/query/ \
  -H "Content-Type: application/json" \
  -d '{"question": "О чём этот документ?"}'
```