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
from app.schemas.models import (
    ABResult,
    AdScore,
    AnalyzeResponse,
    BaselineComparison,
    BaselineMetric,
    CompareResponse,
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
# TribeV2 inference
# -----------------------------------------------------------------------

def run_prediction(
    model: Any,
    file_bytes: bytes,
    filename: str,
    modality: str,
) -> np.ndarray:
    """Run TribeV2 prediction on a single input file.

    Returns
    -------
    np.ndarray of shape (T, n_vertices)
    """
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
