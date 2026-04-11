from typing import List


def split_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    chunks = []
    start = 0
    text_len = len(text)

    while start < text_len:
        end = min(start + chunk_size, text_len)

        # Обрезаем до границы слова, если не в конце текста
        if end < text_len:
            boundary = text.rfind(' ', start, end)
            if boundary > start:
                end = boundary

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        # Следующий старт с отступом назад на overlap, по границе слова
        next_start = end - overlap
        if next_start <= start:
            next_start = end  # защита от зависания на очень длинных словах
        if next_start < text_len:
            boundary = text.find(' ', next_start)
            if 0 < boundary - next_start < overlap:
                next_start = boundary + 1
        start = next_start

    return chunks