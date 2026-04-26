"""HTTP client for the TribeV2 Modal API.

The TribeV2 model runs on a GPU container in Modal.  This module wraps
those HTTP calls so the local FastAPI backend can proxy them without the
frontend ever hitting Modal directly (which would burn cold-start credits
on every browser tab).

Configuration (via environment variables):
  TRIBEV2_URL  — base URL of the deployed Modal endpoint, e.g.
                 https://molyleelatham--tribev2-ad-scorer-tribeapp-serve.modal.run
                 Defaults to empty string → brain scoring is skipped.
  TRIBEV2_TIMEOUT — request timeout in seconds (default 120, Modal cold
                    starts can be slow on first request).
"""
from __future__ import annotations

import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

_BASE_URL_ENV = "TRIBEV2_URL"
_TIMEOUT_ENV = "TRIBEV2_TIMEOUT"
_DEFAULT_TIMEOUT = 120  # seconds — Modal cold starts can take ~30-60s


def _base_url() -> str:
    return (os.environ.get(_BASE_URL_ENV) or "").rstrip("/")


def _timeout() -> float:
    try:
        return float(os.environ.get(_TIMEOUT_ENV) or _DEFAULT_TIMEOUT)
    except (ValueError, TypeError):
        return _DEFAULT_TIMEOUT


async def tribev2_analyze_single(
    *,
    file_bytes: bytes,
    filename: str,
    modality: str = "video",
    ad_id: str = "ad_001",
) -> dict[str, Any] | None:
    """
    Call POST /analyze on the TribeV2 Modal endpoint.

    Returns the raw JSON dict on success, or None if:
      - TRIBEV2_URL is not set
      - The request fails / times out
      - Modal returns a non-2xx status
    """
    base = _base_url()
    if not base:
        logger.debug("TRIBEV2_URL not set — skipping brain scoring")
        return None

    try:
        import httpx
    except ImportError:
        logger.warning("httpx not installed — cannot call TribeV2. Add httpx to requirements.txt")
        return None

    url = f"{base}/analyze"
    try:
        async with httpx.AsyncClient(timeout=_timeout()) as client:
            resp = await client.post(
                url,
                data={"modality": modality, "ad_id": ad_id},
                files={"file": (filename, file_bytes, _mime(filename))},
            )
        if resp.status_code >= 400:
            logger.warning(
                "TribeV2 /analyze returned %s: %s",
                resp.status_code,
                resp.text[:300],
            )
            return None
        return resp.json()
    except Exception as exc:
        logger.warning("TribeV2 /analyze failed: %s: %s", type(exc).__name__, exc)
        return None


async def tribev2_compare(
    *,
    file_a_bytes: bytes,
    file_a_name: str,
    file_b_bytes: bytes,
    file_b_name: str,
    modality: str = "video",
    ad_a_id: str = "ad_A",
    ad_b_id: str = "ad_B",
) -> dict[str, Any] | None:
    """
    Call POST /compare on the TribeV2 Modal endpoint.

    Returns the raw JSON dict on success, or None on any failure.
    """
    base = _base_url()
    if not base:
        logger.debug("TRIBEV2_URL not set — skipping brain comparison")
        return None

    try:
        import httpx
    except ImportError:
        logger.warning("httpx not installed — cannot call TribeV2.")
        return None

    url = f"{base}/compare"
    try:
        async with httpx.AsyncClient(timeout=_timeout()) as client:
            resp = await client.post(
                url,
                data={
                    "modality": modality,
                    "ad_a_id": ad_a_id,
                    "ad_b_id": ad_b_id,
                },
                files={
                    "file_a": (file_a_name, file_a_bytes, _mime(file_a_name)),
                    "file_b": (file_b_name, file_b_bytes, _mime(file_b_name)),
                },
            )
        if resp.status_code >= 400:
            logger.warning(
                "TribeV2 /compare returned %s: %s",
                resp.status_code,
                resp.text[:300],
            )
            return None
        return resp.json()
    except Exception as exc:
        logger.warning("TribeV2 /compare failed: %s: %s", type(exc).__name__, exc)
        return None


async def tribev2_health() -> dict[str, Any] | None:
    """Ping the TribeV2 /health endpoint. Returns None when unreachable."""
    base = _base_url()
    if not base:
        return None
    try:
        import httpx
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{base}/health")
        return resp.json() if resp.status_code == 200 else None
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_MIME_MAP: dict[str, str] = {
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".webm": "video/webm",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".txt": "text/plain",
}


def _mime(filename: str) -> str:
    from pathlib import Path
    return _MIME_MAP.get(Path(filename).suffix.lower(), "application/octet-stream")


def modality_from_filename(filename: str) -> str:
    """Infer TribeV2 modality string from file extension."""
    from pathlib import Path
    suffix = Path(filename).suffix.lower()
    if suffix in {".mp4", ".mov", ".avi", ".webm", ".mkv"}:
        return "video"
    if suffix in {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}:
        return "image"
    if suffix in {".mp3", ".wav", ".m4a", ".ogg", ".flac"}:
        return "audio"
    return "video"  # safe default — TribeV2 handles video best
