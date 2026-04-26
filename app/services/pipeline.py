"""Pipeline: file upload → TribeV2 predict → Bayesian scoring → response.

Two interaction modes:
  1. analyze_single  — ONE ad scored against the historical baseline
  2. compare_two     — TWO ads scored head-to-head (A/B test)

This module contains the pure business logic.  It receives a loaded
TribeModel instance (injected by the Modal app at startup) so it has no
dependency on Modal itself and can be unit-tested locally with mock data.

Logfire spans are used to trace each pipeline stage.  If Logfire is not
configured the spans are noops — zero overhead.
"""

from __future__ import annotations

import logging
import os
import tempfile
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Dict, Generator, List

import numpy as np

from app.scoring.bayesian_scorer import BayesianMarketingScorer
from app.scoring.roi_config import PILLAR_DEFS, ROI_VERTEX_RANGES
from app.schemas.models import (
    ABResult,
    AdScore,
    AnalyzeResponse,
    BaselineComparison,
    BaselineMetric,
    BrainActivationData,
    BrainRegionActivation,
    CompareResponse,
    PillarScore,
    PillarTimeline,
    ROIComparison,
    ROIMeans,
    TimelinePoint,
)

logger = logging.getLogger(__name__)


# -----------------------------------------------------------------------
# Logfire helper — graceful noop when not configured
# -----------------------------------------------------------------------

@contextmanager
def _span(name: str, **attrs: Any) -> Generator[None, None, None]:
    """Open a Logfire span if available, otherwise noop."""
    try:
        import logfire
        with logfire.span(name, **attrs):
            yield
    except Exception:
        yield


def _log(msg: str, **attrs: Any) -> None:
    """Log an info event to Logfire if available."""
    try:
        import logfire
        logfire.info(msg, **attrs)
    except Exception:
        pass


# -----------------------------------------------------------------------
# Prediction cache — skip TribeV2 for repeated uploads
# -----------------------------------------------------------------------

import hashlib

# ---------------------------------------------------------------------------
# Volume-backed prediction cache
# ---------------------------------------------------------------------------
# Predictions are persisted as .npy files on the Modal Volume mounted at
# /feature-cache/pred_cache/.  An in-memory LRU dict avoids re-reading the
# volume on repeated requests within the same container lifetime.
# ---------------------------------------------------------------------------

_VOLUME_CACHE_DIR = Path("/feature-cache/pred_cache")
_MEM_CACHE: dict[str, np.ndarray] = {}  # hot in-memory layer


def _ensure_cache_dir() -> None:
    """Create the on-volume cache directory if it doesn't exist."""
    _VOLUME_CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _content_hash(data: bytes, modality: str) -> str:
    """SHA-256 of file bytes + modality → stable cache key."""
    h = hashlib.sha256(data)
    h.update(modality.encode())
    return h.hexdigest()


def _cache_path(key: str) -> Path:
    """Return the on-volume path for a given cache key."""
    return _VOLUME_CACHE_DIR / f"{key}.npy"


def _cache_get(key: str) -> np.ndarray | None:
    """Look up a prediction by content hash.  Memory first, then volume."""
    if key in _MEM_CACHE:
        return _MEM_CACHE[key]

    p = _cache_path(key)
    if p.exists():
        arr = np.load(p)
        _MEM_CACHE[key] = arr
        return arr

    return None


def _cache_put(key: str, preds: np.ndarray) -> None:
    """Write predictions to in-memory cache AND the persistent volume."""
    _MEM_CACHE[key] = preds
    _ensure_cache_dir()
    np.save(_cache_path(key), preds)
    # Ask Modal to commit the volume so data survives container shutdown
    try:
        import modal
        modal.Volume.from_name("tribev2-feature-cache").commit()
    except Exception:
        pass  # non-fatal — the file is already on disk


# -----------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------

def _write_temp(data: bytes, suffix: str) -> str:
    """Persist bytes to a temp file, flush to disk, return path."""
    f = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    f.write(data)
    f.flush()
    os.fsync(f.fileno())
    f.close()
    return f.name


def _image_to_video(image_bytes: bytes, filename: str, duration: int = 3) -> str:
    """Convert a static image to a short video using ffmpeg.

    Creates a video that holds the image for ``duration`` seconds at 1 fps,
    which gives TribeV2 ``duration`` time-segments to work with.

    Returns the path to the generated .mp4 temp file.
    """
    import subprocess

    suffix = Path(filename).suffix or ".png"
    img_path = _write_temp(image_bytes, suffix)
    video_path = img_path.replace(suffix, ".mp4")

    try:
        subprocess.run(
            [
                "ffmpeg", "-y",
                "-loop", "1",
                "-i", img_path,
                "-c:v", "libx264",
                "-t", str(duration),
                "-pix_fmt", "yuv420p",
                "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
                "-r", "1",
                video_path,
            ],
            capture_output=True,
            check=True,
        )
        _log("image_to_video", source=filename, duration=duration, output=video_path)
        return video_path
    except subprocess.CalledProcessError as e:
        logger.error("ffmpeg failed: %s", e.stderr.decode())
        raise RuntimeError(f"ffmpeg image→video conversion failed: {e.stderr.decode()}")
    finally:
        os.unlink(img_path)


def _score_dict_to_schema(raw: Dict[str, Any]) -> AdScore:
    """Convert BayesianMarketingScorer.score_ad() dict → Pydantic AdScore."""
    timeline_records = raw["timeline"].to_dict(orient="records")
    timeline = [
        TimelinePoint(
            second=row["second"],
            dominant_emotion=row["dominant_emotion"],
            posterior_P_convert=row["posterior_P_convert"],
            roi_emotion=row["roi_emotion"],
            roi_language=row["roi_language"],
            roi_attention=row["roi_attention"],
            roi_visual=row["roi_visual"],
            roi_dmn=row["roi_dmn"],
        )
        for row in timeline_records
    ]
    return AdScore(
        ad_id=raw["ad_id"],
        T_seconds=raw["T_seconds"],
        peak_score=raw["peak_score"],
        peak_second=raw["peak_second"],
        sustained_score=raw["sustained_score"],
        dropoff_penalty=raw["dropoff_penalty"],
        composite_score=raw["composite_score"],
        dominant_emotion_overall=raw["dominant_emotion_overall"],
        roi_means=ROIMeans(**raw["roi_means"]),
        timeline=timeline,
    )


def _baseline_dict_to_schema(raw: Dict[str, Any]) -> BaselineComparison:
    """Convert baseline_compare() dict → Pydantic BaselineComparison."""
    score_metrics = {
        k: BaselineMetric(**v) for k, v in raw["score_vs_baseline"].items()
    }
    roi_metrics = {
        k: BaselineMetric(**v) for k, v in raw["roi_vs_baseline"].items()
    }
    return BaselineComparison(
        ad_id=raw["ad_id"],
        verdict=raw["verdict"],
        percentile=raw["percentile"],
        score_vs_baseline=score_metrics,
        roi_vs_baseline=roi_metrics,
    )


def _ab_dict_to_schema(raw: Dict[str, Any]) -> ABResult:
    """Convert ab_probability() dict → Pydantic ABResult."""
    roi_cmp = {
        k: ROIComparison(**v) for k, v in raw["roi_comparison"].items()
    }
    return ABResult(
        ad_a=raw["ad_a"],
        ad_b=raw["ad_b"],
        P_A_wins_overall=raw["P_A_wins_overall"],
        P_A_beats_B_peak_score=raw["P_A_beats_B_peak_score"],
        P_A_beats_B_sustained_score=raw["P_A_beats_B_sustained_score"],
        P_A_beats_B_composite_score=raw["P_A_beats_B_composite_score"],
        roi_comparison=roi_cmp,
        winner=raw["winner"],
        confidence=raw["confidence"],
    )


# -----------------------------------------------------------------------
# Pillar + brain activation helpers
# -----------------------------------------------------------------------

_ROI_LABELS: Dict[str, str] = {
    "emotion":   "Limbic / Emotion",
    "language":  "Language Network",
    "attention": "Dorsal Attention",
    "visual":    "Visual Cortex",
    "dmn":       "Default-Mode Network",
}


def _compute_pillars(roi_means: Dict[str, float]) -> List[PillarScore]:
    """Compute pillar scores from ROI mean activations."""
    pillars = []
    for p in PILLAR_DEFS:
        contributions = {}
        score = 0.0
        for roi, weight in p.roi_weights.items():
            val = roi_means.get(roi, 0.0)
            contributions[roi] = round(val * weight, 6)
            score += val * weight
        pillars.append(PillarScore(
            key=p.key,
            label=p.label,
            description=p.description,
            score=round(score, 6),
            roi_contributions=contributions,
            brain_regions=p.brain_regions,
            color=p.color,
        ))
    return pillars


def _compute_pillar_timeline(
    timeline_df: Any, fps: int = 1
) -> List[PillarTimeline]:
    """Compute per-second pillar activations from the scorer's timeline DataFrame."""
    points = []
    for _, row in timeline_df.iterrows():
        roi_t = {
            "emotion":   float(row["roi_emotion"]),
            "language":  float(row["roi_language"]),
            "attention": float(row["roi_attention"]),
            "visual":    float(row["roi_visual"]),
            "dmn":       float(row["roi_dmn"]),
        }
        pillar_vals = {}
        for p in PILLAR_DEFS:
            val = sum(roi_t.get(roi, 0.0) * w for roi, w in p.roi_weights.items())
            pillar_vals[p.key] = round(val, 6)

        points.append(PillarTimeline(
            second=float(row["second"]),
            **pillar_vals,
        ))
    return points


def _compute_brain_data(
    pred_matrix: np.ndarray, fps: int = 1
) -> BrainActivationData:
    """Extract vertex-level activation data from the raw prediction matrix.

    Returns everything a UI needs to render a 3D brain heatmap.
    """
    T = pred_matrix.shape[0]
    abs_preds = np.abs(pred_matrix)

    # per-vertex summary stats
    mean_per_vertex = abs_preds.mean(axis=0)  # (n_vertices,)
    peak_per_vertex = abs_preds.max(axis=0)   # (n_vertices,)

    # per-region summaries
    regions = []
    for roi, ranges in ROI_VERTEX_RANGES.items():
        # collect all vertices for this ROI
        roi_verts = []
        for start, end in ranges:
            roi_verts.append(abs_preds[:, start : end + 1])
        roi_concat = np.concatenate(roi_verts, axis=1)  # (T, n_roi_verts)
        roi_mean_per_t = roi_concat.mean(axis=1)          # (T,)

        regions.append(BrainRegionActivation(
            roi=roi,
            label=_ROI_LABELS.get(roi, roi),
            mean_activation=round(float(roi_mean_per_t.mean()), 6),
            peak_activation=round(float(roi_mean_per_t.max()), 6),
            peak_second=round(float(np.argmax(roi_mean_per_t)) / fps, 2),
            vertex_range=[[s, e] for s, e in ranges],
        ))

    return BrainActivationData(
        duration_seconds=T,
        regions=regions,
        vertex_activations_mean=[round(float(v), 6) for v in mean_per_vertex],
        vertex_activations_peak=[round(float(v), 6) for v in peak_per_vertex],
    )


# -----------------------------------------------------------------------
# TribeV2 inference
# -----------------------------------------------------------------------

def run_prediction(
    model: Any,
    file_bytes: bytes,
    filename: str,
    modality: str,
) -> np.ndarray:
    """Run TribeV2 prediction on a single input file.

    Uses a content-hash cache: if the same file+modality was already
    processed, returns the cached predictions instantly.

    Returns
    -------
    np.ndarray of shape (T, n_vertices)
    """
    # ── Check prediction cache (memory → volume) ────────────────
    cache_key = _content_hash(file_bytes, modality)
    cached = _cache_get(cache_key)
    if cached is not None:
        _log("cache hit", filename=filename, modality=modality, cache_key=cache_key[:12])
        return cached

    # Image modality: convert to a short video first, then run as video
    if modality == "image":
        with _span("image_to_video", filename=filename):
            video_path = _image_to_video(file_bytes, filename)
        try:
            with _span("tribev2.get_events", modality="video", filename=filename, original_modality="image"):
                events = model.get_events_dataframe(video_path=video_path)

            with _span("tribev2.predict", modality="video", n_events=len(events)):
                preds, _segments = model.predict(events=events, verbose=False)

            _log(
                "tribev2 prediction complete (image→video)",
                shape_T=int(preds.shape[0]),
                shape_vertices=int(preds.shape[1]),
                filename=filename,
            )
            _cache_put(cache_key, preds)
            return preds
        finally:
            os.unlink(video_path)

    suffix = Path(filename).suffix or {
        "video": ".mp4",
        "audio": ".wav",
        "text": ".txt",
    }[modality]
    path = _write_temp(file_bytes, suffix)
    try:
        with _span("tribev2.get_events", modality=modality, filename=filename):
            kwargs = {f"{modality}_path": path}
            events = model.get_events_dataframe(**kwargs)

        with _span("tribev2.predict", modality=modality, n_events=len(events)):
            preds, _segments = model.predict(events=events, verbose=False)

        _log(
            "tribev2 prediction complete",
            shape_T=int(preds.shape[0]),
            shape_vertices=int(preds.shape[1]),
            filename=filename,
        )
        _cache_put(cache_key, preds)
        return preds  # (T, n_vertices)
    finally:
        os.unlink(path)


# -----------------------------------------------------------------------
# Mode 1: Single ad vs historical baseline
# -----------------------------------------------------------------------

def analyze_single(
    model: Any,
    file_bytes: bytes,
    filename: str,
    modality: str,
    ad_id: str = "ad_001",
) -> AnalyzeResponse:
    """Score one ad and compare it against the historical average.

    Pipeline:
      file → TribeV2 predict → Bayesian score → baseline comparison
    """
    with _span("pipeline.analyze_single", ad_id=ad_id, modality=modality):
        scorer = BayesianMarketingScorer()

        preds = run_prediction(model, file_bytes, filename, modality)

        with _span("bayesian.score_ad", ad_id=ad_id):
            raw = scorer.score_ad(preds, ad_id=ad_id)

        with _span("bayesian.baseline_compare", ad_id=ad_id):
            baseline_raw = scorer.baseline_compare(raw)

        # ── Pillar scores ──────────────────────────────────────────
        with _span("pillars.compute", ad_id=ad_id):
            pillars = _compute_pillars(raw["roi_means"])
            pillar_timeline = _compute_pillar_timeline(raw["timeline"])

        # ── Brain activation data ─────────────────────────────────
        with _span("brain.compute", ad_id=ad_id):
            brain = _compute_brain_data(preds)

        _log(
            "analyze complete",
            ad_id=ad_id,
            composite=raw["composite_score"],
            verdict=baseline_raw["verdict"],
            percentile=baseline_raw["percentile"],
        )

        return AnalyzeResponse(
            ad=_score_dict_to_schema(raw),
            vs_baseline=_baseline_dict_to_schema(baseline_raw),
            pillars=pillars,
            pillar_timeline=pillar_timeline,
            brain=brain,
        )


# -----------------------------------------------------------------------
# Mode 2: Two ads head-to-head (A/B test)
# -----------------------------------------------------------------------

def compare_two(
    model: Any,
    file_a: Dict[str, Any],
    file_b: Dict[str, Any],
) -> CompareResponse:
    """Score two ads and compare them head-to-head.

    Parameters
    ----------
    model : TribeModel
    file_a, file_b : dicts with keys ``bytes``, ``filename``, ``modality``,
                     ``ad_id``.

    Pipeline:
      file_A → TribeV2 predict → Bayesian score ─┐
      file_B → TribeV2 predict → Bayesian score ─┼→ A/B probability
    """
    with _span("pipeline.compare_two", ad_a=file_a["ad_id"], ad_b=file_b["ad_id"]):
        scorer = BayesianMarketingScorer()

        with _span("score_variant", ad_id=file_a["ad_id"]):
            preds_a = run_prediction(model, file_a["bytes"], file_a["filename"], file_a["modality"])
            raw_a = scorer.score_ad(preds_a, ad_id=file_a["ad_id"])

        with _span("score_variant", ad_id=file_b["ad_id"]):
            preds_b = run_prediction(model, file_b["bytes"], file_b["filename"], file_b["modality"])
            raw_b = scorer.score_ad(preds_b, ad_id=file_b["ad_id"])

        with _span("bayesian.ab_probability"):
            ab_raw = scorer.ab_probability(raw_a, raw_b)

        _log(
            "compare complete",
            winner=ab_raw["winner"],
            confidence=ab_raw["confidence"],
            P_A_wins=ab_raw["P_A_wins_overall"],
            composite_a=raw_a["composite_score"],
            composite_b=raw_b["composite_score"],
        )

        return CompareResponse(
            ad_a=_score_dict_to_schema(raw_a),
            ad_b=_score_dict_to_schema(raw_b),
            ab_result=_ab_dict_to_schema(ab_raw),
        )
