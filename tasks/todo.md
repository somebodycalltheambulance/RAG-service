# Fixes: 8 issues

## Plan

- [x] 1. SQL-инъекция — `query.py`: заменить f-string на `CAST(:embedding AS vector)`
- [x] 2. Блокировка event loop — `embedding_service.py`: добавить async-обёртки через `asyncio.to_thread`; обновить вызовы в `documents.py` и `query.py`
- [x] 3. GET /documents/ — `documents.py`: добавить эндпоинт списка документов
- [x] 4. Нормализация кеш-ключа — `cache_service.py`: `.strip().lower()` в `_make_key`; исправить сборку ключа в `query.py`
- [x] 5. Дубли — `models/__init__.py`: добавить `content_hash`; новая миграция; проверка в `documents.py`
- [x] 6. Чанкинг — `document_service.py`: обрезать по границам слов
- [x] 7. Groq proxy — `config.py`: default `""`; `llm_service.py`: не передавать прокси если пустой
- [x] 8. Тесты — `tests/test_query.py`: тесты для `/query/` с моками
