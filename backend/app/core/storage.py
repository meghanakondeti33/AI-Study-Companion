import os
import uuid
import re
from pathlib import Path
from abc import ABC, abstractmethod
from app.config import settings


class StorageService(ABC):
    """Abstract interface for application file storage."""

    @abstractmethod
    def save_file(self, content: bytes, original_filename: str) -> str:
        """Save file content and return a storage_key."""
        pass

    @abstractmethod
    def get_file(self, storage_key: str) -> bytes:
        """Retrieve file content by storage_key."""
        pass

    @abstractmethod
    def get_file_path(self, storage_key: str) -> Path:
        """Return the absolute path to the file if local storage."""
        pass

    @abstractmethod
    def delete_file(self, storage_key: str) -> bool:
        """Delete file by storage_key."""
        pass


class LocalStorageService(StorageService):
    """Local filesystem implementation of StorageService."""

    def __init__(self, base_dir: str | None = None):
        raw = base_dir or settings.STORAGE_LOCAL_PATH
        p = Path(raw)
        if not p.is_absolute():
            # Resolve relative to project root
            project_root = Path(__file__).resolve().parent.parent.parent.parent
            candidate = (project_root / raw).resolve()
            if candidate.exists() or not p.exists():
                p = candidate
            else:
                p = p.resolve()
        else:
            p = p.resolve()
        self.base_dir = p
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _sanitize_filename(self, filename: str) -> str:
        name = os.path.basename(filename)
        cleaned = re.sub(r"[^a-zA-Z0-9_.-]", "_", name)
        return cleaned or "document.pdf"

    def _resolve_path(self, storage_key: str) -> Path:
        target = (self.base_dir / storage_key).resolve()
        # Prevent directory traversal attacks
        if not str(target).startswith(str(self.base_dir)):
            raise ValueError(f"Invalid storage key path traversal: {storage_key}")
        return target

    def save_file(self, content: bytes, original_filename: str) -> str:
        safe_name = self._sanitize_filename(original_filename)
        unique_prefix = uuid.uuid4().hex
        storage_key = f"{unique_prefix}_{safe_name}"
        target_path = self._resolve_path(storage_key)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        with open(target_path, "wb") as f:
            f.write(content)
        return storage_key

    def get_file(self, storage_key: str) -> bytes:
        target_path = self._resolve_path(storage_key)
        if not target_path.exists():
            # Check secondary fallback location (e.g. backend/storage/uploads vs storage/uploads)
            project_root = Path(__file__).resolve().parent.parent.parent.parent
            for alt_dir in [project_root / "storage" / "uploads", project_root / "backend" / "storage" / "uploads"]:
                alt_path = alt_dir / storage_key
                if alt_path.exists():
                    target_path = alt_path
                    break
        if not target_path.exists():
            raise FileNotFoundError(f"Stored file not found: {storage_key}")
        with open(target_path, "rb") as f:
            return f.read()

    def get_file_path(self, storage_key: str) -> Path:
        target_path = self._resolve_path(storage_key)
        if not target_path.exists():
            project_root = Path(__file__).resolve().parent.parent.parent.parent
            for alt_dir in [project_root / "storage" / "uploads", project_root / "backend" / "storage" / "uploads"]:
                alt_path = alt_dir / storage_key
                if alt_path.exists():
                    return alt_path
            raise FileNotFoundError(f"Stored file not found: {storage_key}")
        return target_path

    def delete_file(self, storage_key: str) -> bool:
        target_path = self._resolve_path(storage_key)
        if target_path.exists():
            target_path.unlink()
            return True
        return False


_storage_service: StorageService | None = None


def get_storage_service() -> StorageService:
    global _storage_service
    if _storage_service is None:
        _storage_service = LocalStorageService()
    return _storage_service
