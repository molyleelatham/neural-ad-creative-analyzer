from __future__ import annotations

import asyncio
import csv
import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from backend.models.schemas import AdSegment

logger = logging.getLogger(__name__)

_REMAP_CACHE: tuple[Path, dict[str, dict[str, Any]]] | None = None


def _load_class_remap() -> dict[str, dict[str, Any]]:
    """
    Load class remapping metadata.

    CSV columns expected:
      - original_class
      - display_name
      - pillar
      - scoring_weight
      - roboflow_label
    """
    global _REMAP_CACHE
    raw_path = (os.environ.get("ARCA_CLASS_REMAP_PATH") or "").strip()
    if raw_path:
        path = Path(raw_path)
    else:
        # Default to weightings.csv (pillars + percent weights)
        path = Path(__file__).resolve().parents[1] / "weightings.csv"

    if _REMAP_CACHE is not None and _REMAP_CACHE[0] == path:
        return _REMAP_CACHE[1]

    mapping: dict[str, dict[str, Any]] = {}
    try:
        if not path.exists():
            _REMAP_CACHE = (path, mapping)
            return mapping

        with path.open("r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                rf = (row.get("roboflow_label") or "").strip().lower()
                if not rf:
                    continue
                def _parse_weight(x: str) -> float:
                    s = (x or "").strip().replace("%", "")
                    try:
                        return float(s)
                    except Exception:
                        return 0.0

                mapping[rf] = {
                    "original_class": (row.get("original_class") or rf).strip(),
                    "display_name": (row.get("display_name") or "").strip() or None,
                    "pillar": (row.get("pillar") or "").strip() or None,
                    "scoring_weight": _parse_weight(row.get("scoring_weight") or "0"),
                    "notes": (row.get("notes") or "").strip() or None,
                }
    except Exception:
        mapping = {}

    _REMAP_CACHE = (path, mapping)
    return mapping


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
    def _safe_float(x: Any, default: float) -> float:
        try:
            return float(x)
        except Exception:
            return default

    remap = _load_class_remap()

    def _norm_key(x: Any) -> str:
        s = str(x or "").strip().lower()
        s = s.replace("-", "_").replace(" ", "_")
        s = "_".join([p for p in s.split("_") if p])
        if not s:
            return "element"
        return s

    def _norm_label(x: Any) -> tuple[str, str | None, str | None, float | None]:
        """
        Returns: (label, display_label, pillar, scoring_weight)
        """
        key = _norm_key(x)

        # Prefer explicit CSV mapping (roboflow_label -> original_class + metadata)
        if key in remap:
            m = remap[key]
            return (
                str(m.get("original_class") or key),
                m.get("display_name"),
                m.get("pillar"),
                float(m.get("scoring_weight")) if m.get("scoring_weight") is not None else None,
            )

        # Small synonym map to keep the UI readable/consistent.
        synonyms: dict[str, str] = {
            "person": "person",
            "male": "person",
            "female": "person",
            "man": "person",
            "woman": "person",
            "logo": "brand_logo",
            "brand": "brand_logo",
            "brand_logo": "brand_logo",
            "product": "product",
            "pack": "product",
            "packshot": "product",
            "headline": "headline_text",
            "headline_text": "headline_text",
            "text": "headline_text",
            "cta": "cta_button",
            "button": "cta_button",
            "cta_button": "cta_button",
            "background": "background",
            "bg": "background",
        }
        normalized = synonyms.get(key, key)
        return normalized, None, None, None

    def _polygon_area(points: list[tuple[float, float]]) -> float:
        # Shoelace formula (absolute area / 2).
        if len(points) < 3:
            return 0.0
        acc = 0.0
        for i in range(len(points)):
            x1, y1 = points[i]
            x2, y2 = points[(i + 1) % len(points)]
            acc += (x1 * y2) - (x2 * y1)
        return abs(acc) * 0.5

    def _extract_points(p: dict[str, Any]) -> list[tuple[float, float]] | None:
        # Common shapes: {"points": [{"x":..,"y":..}, ...]} or {"polygon": {...}} etc.
        for key in ("points", "polygon", "segmentation", "mask", "contour"):
            v = p.get(key)
            if isinstance(v, dict):
                v = v.get("points") or v.get("vertices") or v.get("path")
            if isinstance(v, list):
                pts: list[tuple[float, float]] = []
                for item in v:
                    if isinstance(item, dict):
                        x = _safe_float(item.get("x"), float("nan"))
                        y = _safe_float(item.get("y"), float("nan"))
                        if x == x and y == y:
                            pts.append((x, y))
                    elif isinstance(item, (list, tuple)) and len(item) >= 2:
                        x = _safe_float(item[0], float("nan"))
                        y = _safe_float(item[1], float("nan"))
                        if x == x and y == y:
                            pts.append((x, y))
                if pts:
                    return pts
        return None

    def _bbox_area(p: dict[str, Any]) -> float:
        # Common Roboflow keys: width/height, or x/y/w/h, or bbox={x,y,width,height}
        bbox = p.get("bbox")
        if isinstance(bbox, dict):
            w = _safe_float(bbox.get("width") or bbox.get("w"), 0.0)
            h = _safe_float(bbox.get("height") or bbox.get("h"), 0.0)
            if w > 0 and h > 0:
                return w * h

        w = _safe_float(p.get("width") or p.get("w"), 0.0)
        h = _safe_float(p.get("height") or p.get("h"), 0.0)
        if w > 0 and h > 0:
            return w * h

        x1 = p.get("x1")
        y1 = p.get("y1")
        x2 = p.get("x2")
        y2 = p.get("y2")
        if all(v is not None for v in (x1, y1, x2, y2)):
            w2 = abs(_safe_float(x2, 0.0) - _safe_float(x1, 0.0))
            h2 = abs(_safe_float(y2, 0.0) - _safe_float(y1, 0.0))
            if w2 > 0 and h2 > 0:
                return w2 * h2
        return 0.0

    def _prediction_area(p: dict[str, Any]) -> float:
        pts = _extract_points(p)
        if pts:
            a = _polygon_area(pts)
            if a > 0:
                return a
        a = _bbox_area(p)
        if a > 0:
            return a
        # Last resort: use confidence as a tiny proxy so we still rank something.
        c = max(0.0, min(_safe_float(p.get("confidence"), 0.5), 1.0))
        return c * 1e-6

    # Aggregate multiple detections of the same class into a single segment.
    by_label: dict[str, dict[str, Any]] = {}
    for p in raw:
        label_raw = p.get("class") or p.get("label") or p.get("name") or "element"
        label, display_label, pillar, scoring_weight = _norm_label(label_raw)
        conf = max(0.0, min(_safe_float(p.get("confidence"), 0.5), 1.0))
        area = _prediction_area(p)
        bucket = by_label.get(label)
        if bucket is None:
            bucket = {
                "label": label,
                "display_label": display_label,
                "pillar": pillar,
                "scoring_weight": scoring_weight,
                "total_area": 0.0,
                "max_conf": 0.0,
                "detections": [],
            }
            by_label[label] = bucket
        bucket["total_area"] += float(area)
        bucket["max_conf"] = max(float(bucket["max_conf"]), float(conf))
        # Keep a few raw detections for debugging/visual overlays later.
        dets: list[dict[str, Any]] = bucket["detections"]
        if len(dets) < 3:
            dets.append(p)

    if not by_label:
        return []

    items = sorted(by_label.values(), key=lambda b: float(b["total_area"]), reverse=True)
    total_area = sum(float(b["total_area"]) for b in items) or 1.0

    # Return all aggregated labels by default (UI can choose how to display).
    # If you ever need a cap for perf, add a env var here.
    segments: list[AdSegment] = []
    for b in items:
        label = str(b["label"])
        display_label = b.get("display_label")
        pillar = b.get("pillar")
        scoring_weight = b.get("scoring_weight")
        area = float(b["total_area"])
        conf = float(b["max_conf"])
        weight = max(0.0, min((area / total_area) * 100.0, 100.0))
        detections = b.get("detections") or []
        segments.append(
            AdSegment(
                label=label,
                display_label=display_label,
                pillar=pillar,
                scoring_weight=float(scoring_weight) if scoring_weight is not None else None,
                confidence=conf,
                visual_weight_pct=weight,
                reasoning=f"SAM3 workflow prediction ({len(detections)} detection(s); weight from geometry).",
                geometry={"detections": detections},
            )
        )

    # Normalize weights to sum ~100 (helps UI when rounding).
    s = sum(seg.visual_weight_pct for seg in segments) or 1.0
    for seg in segments:
        seg.visual_weight_pct = max(0.0, min((seg.visual_weight_pct / s) * 100.0, 100.0))

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


async def sam3_raw_for_image(image_path: str | Path) -> dict[str, Any] | None:
    """
    Returns the raw Roboflow workflow JSON response when configured.
    Returns None when not configured or when it fails.
    """
    env = _load_env()
    if env is None:
        return None

    path = Path(image_path)
    if not path.exists():
        return None

    try:
        payload = await asyncio.to_thread(_run_workflow_sync, env, path)
        if isinstance(payload, dict):
            return payload
        # Ensure JSON-serializable dict shape for FastAPI responses.
        return {"value": payload}
    except Exception:
        return None

