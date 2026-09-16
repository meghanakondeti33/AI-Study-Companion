from typing import List, Dict, Any
from app.config import settings


def chunk_page_text(
    text: str,
    page_number: int,
    material_id: str,
    project_id: str,
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
    start_chunk_index: int = 0,
) -> List[Dict[str, Any]]:
    """
    Splits extracted page text into deterministic chunks while preserving
    material_id, project_id, page_number, and chunk_index.
    """
    size = chunk_size or settings.CHUNK_SIZE
    overlap = chunk_overlap or settings.CHUNK_OVERLAP

    cleaned_text = text.strip()
    if not cleaned_text:
        return []

    # If text is smaller than chunk size, return single chunk
    if len(cleaned_text) <= size:
        return [
            {
                "material_id": material_id,
                "project_id": project_id,
                "page_number": page_number,
                "chunk_index": start_chunk_index,
                "content": cleaned_text,
            }
        ]

    chunks: List[Dict[str, Any]] = []
    current_index = start_chunk_index
    start = 0

    while start < len(cleaned_text):
        end = start + size
        if end >= len(cleaned_text):
            chunk_content = cleaned_text[start:].strip()
            if chunk_content:
                chunks.append(
                    {
                        "material_id": material_id,
                        "project_id": project_id,
                        "page_number": page_number,
                        "chunk_index": current_index,
                        "content": chunk_content,
                    }
                )
            break

        # Try to break at a newline or space boundary near the end
        boundary = cleaned_text.rfind("\n", start, end)
        if boundary == -1 or boundary <= start + (size // 2):
            boundary = cleaned_text.rfind(" ", start, end)

        if boundary != -1 and boundary > start + (size // 2):
            chunk_content = cleaned_text[start:boundary].strip()
            start = boundary + 1
        else:
            chunk_content = cleaned_text[start:end].strip()
            start = end - overlap

        if chunk_content:
            chunks.append(
                {
                    "material_id": material_id,
                    "project_id": project_id,
                    "page_number": page_number,
                    "chunk_index": current_index,
                    "content": chunk_content,
                }
            )
            current_index += 1

    return chunks
