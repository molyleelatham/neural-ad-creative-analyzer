import uuid
from pathlib import Path

from fastapi import UploadFile

BACKEND_ROOT = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BACKEND_ROOT / "uploads"


def ensure_upload_dir() -> Path:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    return UPLOAD_DIR


async def save_upload(file: UploadFile, dest_dir: Path | None = None) -> Path:
    """Persist an upload to disk; returns the saved file path."""
    directory = dest_dir or ensure_upload_dir()
    directory.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename or "upload").suffix or ".bin"
    safe_name = f"{uuid.uuid4().hex}{suffix}"
    out_path = directory / safe_name
    content = await file.read()
    out_path.write_bytes(content)
    await file.seek(0)
    return out_path
