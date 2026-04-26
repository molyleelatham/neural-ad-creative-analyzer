from __future__ import annotations

import asyncio
import csv
import logging
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from backend.models.schemas import AdSegment

logger = logging.getLogger(__name__)

_REMAP_CACHE: tuple[Path, dict[str, dict[str, Any]]] | None = None

# ---------------------------------------------------------------------------
# Video support constants
# ---------------------------------------------------------------------------

_VIDEO_EXTENSIONS: frozenset[str] = frozenset(
    {".mp4", ".mov", ".avi", ".webm", ".mkv", ".m4v", ".flv"}
)
# How many evenly-spaced frames to sample from a video.
# Override with the env var SAM3_VIDEO_MAX_FRAMES.
_DEFAULT_VIDEO_MAX_FRAMES = 8


def _is_video_file(path: Path) -> bool:
    return path.suffix.lower() in _VIDEO_EXTENSIONS


def _video_max_frames() -> int:
    try:
        return int(os.environ.get("SAM3_VIDEO_MAX_FRAMES") or _DEFAULT_VIDEO_MAX_FRAMES)
    except (ValueError, TypeError):
        return _DEFAULT_VIDEO_MAX_FRAMES


def _extract_video_frames(video_path: Path, max_frames: int, dest_dir: Path) -> list[Path]:
    """
    Use OpenCV to extract up to ``max_frames`` evenly-spaced frames from a
    video file, writing each as a JPEG into ``dest_dir``.

    Returns a list of written frame paths (may be empty on error).
    """
    try:
        import cv2  # type: ignore[import]
    except ImportError:
        logger.warning(
            "opencv-python-headless is not installed — cannot extract video frames. "
            "Add opencv-python-headless to requirements.txt"
        )
        return []

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        logger.warning("SAM3: cv2 could not open video %s", video_path.name)
        return []

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total_frames <= 0:
        # Some containers don't report frame count; fall back to sequential reads.
        total_frames = max_frames * 30  # rough upper bound

    # Pick evenly-spaced indices across the full duration.
    n = min(max_frames, max(1, total_frames))
    step = max(1, total_frames // n)
    indices = [i * step for i in range(n)]

    written: list[Path] = []
    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ok, frame = cap.read()
        if not ok:
            continue
        frame_path = dest_dir / f"frame_{idx:06d}.jpg"
        cv2.imwrite(str(frame_path), frame)
        written.append(frame_path)

    cap.release()
    logger.info(
        "SAM3: extracted %d/%d frames from %s", len(written), n, video_path.name
    )
    return written


def _merge_frame_segments(frame_results: list[list[AdSegment]]) -> list[AdSegment]:
    """
    Merge per-frame segment lists into a single consolidated list.

    Strategy:
    - Group by label across all frames.
    - ``confidence`` = max over all frames (most-confident detection wins).
    - ``visual_weight_pct`` = average over frames that saw the label
      (represents how consistently prominent the element is throughout the video).
    - ``reasoning`` updated to mention video + frame counts.
    """
    if not frame_results:
        return []

    total_frames = len(frame_results)
    by_label: dict[str, dict[str, Any]] = {}

    for frame_segs in frame_results:
        for seg in frame_segs:
            bucket = by_label.get(seg.label)
            if bucket is None:
                bucket = {
                    "seg": seg,
                    "max_conf": seg.confidence,
                    "weight_sum": seg.visual_weight_pct,
                    "frame_count": 1,
                }
                by_label[seg.label] = bucket
            else:
                bucket["max_conf"] = max(float(bucket["max_conf"]), seg.confidence)
                bucket["weight_sum"] += seg.visual_weight_pct
                bucket["frame_count"] += 1

    merged: list[AdSegment] = []
    for label, b in by_label.items():
        base: AdSegment = b["seg"]
        avg_weight = float(b["weight_sum"]) / total_frames
        merged.append(
            AdSegment(
                label=base.label,
                display_label=base.display_label,
                pillar=base.pillar,
                scoring_weight=base.scoring_weight,
                confidence=float(b["max_conf"]),
                visual_weight_pct=avg_weight,
                reasoning=(
                    f"SAM3 video analysis: detected in {b['frame_count']}/{total_frames} frames "
                    f"(avg prominence {avg_weight:.1f}%, peak confidence {b['max_conf']:.2f})."
                ),
                geometry=base.geometry,
            )
        )

    # Re-normalise weights to ~100.
    total_w = sum(s.visual_weight_pct for s in merged) or 1.0
    for seg in merged:
        seg.visual_weight_pct = max(0.0, min((seg.visual_weight_pct / total_w) * 100.0, 100.0))

    return sorted(merged, key=lambda s: s.visual_weight_pct, reverse=True)


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
        # Default to class_remap.csv in backend directory
        path = Path(__file__).resolve().parent / "class_remap.csv"

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
            for k, v in x.items():
                if _is_predictions_key(k):
                    # Direct list (most common)
                    if isinstance(v, list):
                        return [p for p in v if isinstance(p, dict)]
                    # Roboflow serverless wraps in {"image": ..., "predictions": [...]}
                    if isinstance(v, dict) and "predictions" in v:
                        inner = v["predictions"]
                        if isinstance(inner, list):
                            return [p for p in inner if isinstance(p, dict)]
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
    Call Roboflow Serverless workflow via the inference-sdk client.

    Uses client.run_workflow() which handles the WorkflowImage serialisation
    correctly for serverless endpoints (raw HTTP with base64 does not work).
    """
    import logfire
    from inference_sdk import InferenceHTTPClient

    with logfire.span(
        "sam3.workflow_call",
        workspace=env.workspace,
        workflow_id=env.workflow_id,
        image=image_path.name,
    ):
        client = InferenceHTTPClient(
            api_url=env.api_url,
            api_key=env.api_key,
        )
        logger.info(
            "SAM3: run_workflow workspace=%s workflow=%s image=%s",
            env.workspace, env.workflow_id, image_path.name,
        )
        try:
            result = client.run_workflow(
                workspace_name=env.workspace,
                workflow_id=env.workflow_id,
                images={env.image_key: str(image_path)},
            )
            logfire.info("sam3.workflow_success", image=image_path.name)
            # run_workflow returns a list of result dicts (one per image)
            if isinstance(result, list) and result:
                return result[0]
            return result
        except Exception as exc:
            logfire.warn("sam3.workflow_error", error=str(exc))
            raise


def _debug_direct_request(env: _Sam3Env, image_path: Path) -> tuple[int, str]:
    """Kept for compatibility; _run_workflow_sync now does direct requests."""
    return 0, "debug handled by _run_workflow_sync"


async def sam3_segments_for_image(image_path: str | Path) -> list[AdSegment] | None:
    """
    Returns segments from the user's trained SAM3 workflow when configured.
    Returns None when not configured or when it fails (caller should fall back).
    """
    import logfire

    env = _load_env()
    if env is None:
        return None

    path = Path(image_path)
    if not path.exists():
        return None

    with logfire.span("sam3.segments", image=path.name, workflow_id=env.workflow_id):
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
                        logfire.warn("sam3.no_predictions", top_level_keys=keys, output_keys=out_keys)
                    else:
                        logger.warning("SAM3: no predictions found. top-level keys=%s", keys)
                        logfire.warn("sam3.no_predictions", top_level_keys=keys)
                else:
                    logger.warning("SAM3: no predictions found. payload_type=%s", type(payload).__name__)
                    logfire.warn("sam3.no_predictions", payload_type=type(payload).__name__)
                return None
            segments = _normalize_segments(preds)
            logger.info("SAM3: extracted %d segments", len(segments))
            logfire.info("sam3.segments_extracted", count=len(segments))
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
                logfire.warn("sam3.error", error=type(exc).__name__, status_code=status_code, api_message=api_message)
            else:
                logger.warning(
                    "SAM3 segmentation skipped (falling back to mocks): %s: %s",
                    type(exc).__name__,
                    exc,
                )
                logfire.warn("sam3.error", error=type(exc).__name__, detail=str(exc))
            return None


async def sam3_raw_for_image(image_path: str | Path) -> dict[str, Any] | None:
    """
    Returns the raw Roboflow workflow JSON response when configured.
    Returns None when not configured or when it fails.
    """
    import logfire

    env = _load_env()
    if env is None:
        return None

    path = Path(image_path)
    if not path.exists():
        return None

    with logfire.span("sam3.raw_response", image=path.name):
        try:
            payload = await asyncio.to_thread(_run_workflow_sync, env, path)
            if isinstance(payload, dict):
                logfire.info("sam3.raw_ok", keys=list(payload.keys())[:10])
                return payload
            # Ensure JSON-serializable dict shape for FastAPI responses.
            return {"value": payload}
        except Exception:
            return None


# ---------------------------------------------------------------------------
# Video analysis
# ---------------------------------------------------------------------------

async def sam3_segments_for_video(video_path: str | Path) -> list[AdSegment] | None:
    """
    Run the SAM3 workflow on evenly-spaced frames extracted from a video file.

    Returns merged segment list (labels consistent across frames are upweighted),
    or None if env is not configured / extraction fails / no predictions found.
    """
    import logfire

    env = _load_env()
    if env is None:
        return None

    path = Path(video_path)
    if not path.exists():
        return None

    max_frames = _video_max_frames()

    with logfire.span(
        "sam3.video_segments",
        video=path.name,
        max_frames=max_frames,
        workflow_id=env.workflow_id,
    ):
        with tempfile.TemporaryDirectory(prefix="sam3_frames_") as tmp_dir:
            frame_paths = await asyncio.to_thread(
                _extract_video_frames, path, max_frames, Path(tmp_dir)
            )

            if not frame_paths:
                logfire.warn("sam3.video_no_frames", video=path.name)
                logger.warning("SAM3: no frames extracted from video %s", path.name)
                return None

            logger.info(
                "SAM3: running workflow on %d frames from %s", len(frame_paths), path.name
            )

            # Run all frames through the workflow concurrently (up to max_frames at once).
            frame_segs_list: list[list[AdSegment]] = []
            tasks = [
                asyncio.to_thread(_run_workflow_sync, env, fp)
                for fp in frame_paths
            ]
            raw_payloads: list[Any] = await asyncio.gather(*tasks, return_exceptions=True)

            for i, result in enumerate(raw_payloads):
                if isinstance(result, BaseException):
                    logger.warning(
                        "SAM3: frame %d workflow error: %s: %s",
                        i,
                        type(result).__name__,
                        result,
                    )
                    continue
                preds = _extract_predictions(result)
                if preds:
                    segs = _normalize_segments(preds)
                    if segs:
                        frame_segs_list.append(segs)

            if not frame_segs_list:
                logfire.warn("sam3.video_no_predictions", video=path.name, frames=len(frame_paths))
                logger.warning(
                    "SAM3: no predictions across %d frames of %s", len(frame_paths), path.name
                )
                return None

            merged = _merge_frame_segments(frame_segs_list)
            logfire.info(
                "sam3.video_segments_merged",
                video=path.name,
                frames_with_preds=len(frame_segs_list),
                total_frames=len(frame_paths),
                segments=len(merged),
            )
            logger.info(
                "SAM3: merged %d segments from %d/%d frames of %s",
                len(merged),
                len(frame_segs_list),
                len(frame_paths),
                path.name,
            )
            return merged or None


# ---------------------------------------------------------------------------
# Unified entry points (image or video)
# ---------------------------------------------------------------------------

async def sam3_segments_for_file(file_path: str | Path) -> list[AdSegment] | None:
    """
    Dispatch to the appropriate SAM3 pipeline based on file type.

    - Video files  → frame extraction + per-frame workflow + merge
    - Image files  → existing single-image workflow

    Returns None when not configured or on any failure (caller falls back to mocks).
    """
    path = Path(file_path)
    if _is_video_file(path):
        return await sam3_segments_for_video(path)
    return await sam3_segments_for_image(path)


async def sam3_raw_for_file(file_path: str | Path) -> dict[str, Any] | None:
    """
    Return the raw Roboflow response for an image file, or a summary dict for
    a video file (raw responses per-frame would be huge).

    Returns None when not configured or on any failure.
    """
    path = Path(file_path)
    if _is_video_file(path):
        # For videos we don't return the full raw payload of every frame —
        # instead return a lightweight summary so callers know it was a video.
        env = _load_env()
        if env is None:
            return None
        max_frames = _video_max_frames()
        return {
            "source": "sam3_video",
            "video": path.name,
            "max_frames_sampled": max_frames,
            "workspace": env.workspace,
            "workflow_id": env.workflow_id,
        }
    return await sam3_raw_for_image(path)

