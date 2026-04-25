from __future__ import annotations

import asyncio
import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from backend.models.schemas import AdSegment

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class _Sam3Env:
    api_url: str
    api_key: str
    workspace: str
    workflow_id: str
    image_key: str


def _load_env() -> _Sam3Env | None:
    api_key = (os.environ.get("ROBOFLOW_API_KEY") or "").strip()
    workspace = (os.environ.get("ROBOFLOW_WORKSPACE") or "").strip()
    workflow_id = (os.environ.get("ROBOFLOW_WORKFLOW_ID") or "").strip()
    api_url = (os.environ.get("ROBOFLOW_API_URL") or "https://serverless.roboflow.com").strip()
    image_key = (os.environ.get("ROBOFLOW_IMAGE_KEY") or "image").strip() or "image"

    if not (api_key and workspace and workflow_id):
        return None
    return _Sam3Env(
        api_url=api_url,
        api_key=api_key,
        workspace=workspace,
        workflow_id=workflow_id,
        image_key=image_key,
    )


def _normalize_segments(raw: list[dict[str, Any]]) -> list[AdSegment]:
    """
    Convert any reasonable Roboflow-ish prediction list into AdSegment list.
    We intentionally keep this tolerant because workflow outputs vary.
    """
    items: list[tuple[str, float]] = []
    for p in raw:
        label = str(p.get("class") or p.get("label") or p.get("name") or "element")
        try:
            conf = float(p.get("confidence", 0.5))
        except Exception:
            conf = 0.5
        items.append((label, max(0.0, min(conf, 1.0))))

    if not items:
        return []

    # If we don't have geometry, approximate "visual weight" from relative confidence.
    total = sum(c for _, c in items) or 1.0
    segments: list[AdSegment] = []
    for label, conf in items[:12]:
        weight = (conf / total) * 100.0
        segments.append(
            AdSegment(
                label=label,
                confidence=conf,
                visual_weight_pct=weight,
                reasoning="SAM3 workflow prediction (weight approximated).",
            )
        )
    return segments


def _extract_predictions(payload: Any) -> list[dict[str, Any]]:
    """
    Find the first list under a "predictions" key anywhere in the payload.
    Roboflow workflow outputs can be nested, so we do a small recursive search.
    """

    def _is_predictions_key(k: Any) -> bool:
        try:
            s = str(k)
        except Exception:
            return False
        s = s.lower()
        return s == "predictions" or s.endswith(".predictions") or s.endswith("_predictions")

    def _walk(x: Any, depth: int) -> list[dict[str, Any]] | None:
        if depth <= 0:
            return None
        if isinstance(x, dict):
            # Support both "predictions" and keys like "model.predictions".
            for k, v in x.items():
                if _is_predictions_key(k) and isinstance(v, list):
                    return [p for p in v if isinstance(p, dict)]
            for v in x.values():
                found = _walk(v, depth - 1)
                if found is not None:
                    return found
        elif isinstance(x, list):
            for item in x:
                found = _walk(item, depth - 1)
                if found is not None:
                    return found
        return None

    return _walk(payload, 6) or []


def _run_workflow_sync(env: _Sam3Env, image_path: Path) -> Any:
    """
    Call Roboflow Serverless workflow and return raw JSON.

    We build the request payload ourselves (base64 image encoding) so we can:
    - guarantee the "InferenceImage" shape expected by the workflow runtime
    - capture the full response body on failure (422/500)
    """
    import requests
    from inference_sdk.http.utils.loaders import load_static_inference_input
    from inference_sdk.http.utils.request_building import inject_images_into_payload

    url = f"{env.api_url.rstrip('/')}/{env.workspace}/workflows/{env.workflow_id}"
    encoded_images = load_static_inference_input(str(image_path))
    try:
        first_len = len(encoded_images[0][0]) if encoded_images else 0
    except Exception:
        first_len = 0

    candidate_keys = [env.image_key, "image", "input_image", "img", "input"]
    last_resp: requests.Response | None = None
    last_exc: Exception | None = None

    for key in candidate_keys:
        # First try the official "InferenceImage" shape (type/value).
        payload: dict[str, Any] = {"api_key": env.api_key, "use_cache": True, "inputs": {}}
        inject_images_into_payload(payload["inputs"], encoded_images, key=key)
        logger.info("SAM3: http payload key=%s encoded_len=%s (type/value)", key, first_len)
        try:
            resp = requests.post(url, json=payload, timeout=60)
            last_resp = resp
            if resp.ok:
                return resp.json()
        except Exception as exc:
            last_exc = exc

        # Fallback: some workflows accept raw base64 string directly.
        if encoded_images:
            raw = encoded_images[0][0]
            for raw_value in (raw, [raw]):
                payload2: dict[str, Any] = {"api_key": env.api_key, "use_cache": True, "inputs": {key: raw_value}}
                logger.info("SAM3: http payload key=%s encoded_len=%s (raw)", key, first_len)
                try:
                    resp = requests.post(url, json=payload2, timeout=60)
                    last_resp = resp
                    if resp.ok:
                        return resp.json()
                except Exception as exc:
                    last_exc = exc
        # keep trying other keys on 4xx/5xx

    if last_resp is not None:
        # Raise something that includes status + body for our caller's logging.
        raise RuntimeError(f"Roboflow workflow failed status={last_resp.status_code} body={last_resp.text[:4000]}")
    if last_exc is not None:
        raise last_exc
    raise RuntimeError("Roboflow workflow call failed (no response).")


def _debug_direct_request(env: _Sam3Env, image_path: Path) -> tuple[int, str]:
    """Kept for compatibility; _run_workflow_sync now does direct requests."""
    return 0, "debug handled by _run_workflow_sync"


async def sam3_segments_for_image(image_path: str | Path) -> list[AdSegment] | None:
    """
    Returns segments from the user's trained SAM3 workflow when configured.
    Returns None when not configured or when it fails (caller should fall back).
    """
    env = _load_env()
    if env is None:
        return None

    path = Path(image_path)
    if not path.exists():
        return None

    try:
        logger.info(
            "SAM3: running workflow=%s workspace=%s on %s",
            env.workflow_id,
            env.workspace,
            path.name,
        )
        payload = await asyncio.to_thread(_run_workflow_sync, env, path)
        preds = _extract_predictions(payload)
        if not preds:
            # Help debug mismatched workflow output schema.
            if isinstance(payload, dict):
                keys = sorted([str(k) for k in payload.keys()])[:25]
                outputs = payload.get("outputs")
                if isinstance(outputs, list) and outputs and isinstance(outputs[0], dict):
                    out_keys = sorted([str(k) for k in outputs[0].keys()])[:25]
                    logger.warning(
                        "SAM3: no predictions found. top-level keys=%s outputs[0] keys=%s "
                        "(workflow likely only outputs visuals; add 'predictions' output in Roboflow workflow)",
                        keys,
                        out_keys,
                    )
                else:
                    logger.warning("SAM3: no predictions found. top-level keys=%s", keys)
            else:
                logger.warning("SAM3: no predictions found. payload_type=%s", type(payload).__name__)
            return None
        segments = _normalize_segments(preds)
        logger.info("SAM3: extracted %d segments", len(segments))
        return segments or None
    except Exception as exc:
        status_code = getattr(exc, "status_code", None)
        api_message = getattr(exc, "api_message", None)
        if status_code is not None or api_message is not None:
            logger.warning(
                "SAM3 segmentation skipped (falling back to mocks): %s status=%s message=%s",
                type(exc).__name__,
                status_code,
                api_message,
            )
        else:
            logger.warning(
                "SAM3 segmentation skipped (falling back to mocks): %s: %s",
                type(exc).__name__,
                exc,
            )
        return None

