"""Pydantic models for the ad-scoring API.

Two interaction modes:
  1. POST /analyze  — ONE ad, scored against the historical baseline
  2. POST /compare  — TWO ads, scored head-to-head (A/B test)
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class InputModality(str, Enum):
    video = "video"
    audio = "audio"
    text = "text"


# ---------------------------------------------------------------------------
# Shared building blocks
# ---------------------------------------------------------------------------

class ROIMeans(BaseModel):
    emotion: float = Field(..., description="Mean limbic / amygdala-adjacent activation")
    language: float = Field(..., description="Mean Broca / Wernicke activation")
    attention: float = Field(..., description="Mean dorsal-attention activation")
    visual: float = Field(..., description="Mean early-visual activation")
    dmn: float = Field(..., description="Mean default-mode activation (disengagement)")


class TimelinePoint(BaseModel):
    second: float
    dominant_emotion: str
    posterior_P_convert: float
    roi_emotion: float
    roi_language: float
    roi_attention: float
    roi_visual: float
    roi_dmn: float


class AdScore(BaseModel):
    """Core scoring output for a single ad."""
    ad_id: str
    T_seconds: int = Field(..., description="Duration in TRs (seconds at 1 Hz)")
    peak_score: float = Field(..., description="Maximum posterior P(Convert)")
    peak_second: float = Field(..., description="Time of peak in seconds")
    sustained_score: float = Field(..., description="Mean posterior across all TRs")
    dropoff_penalty: float = Field(..., description="Activation drop after peak")
    composite_score: float = Field(..., description="Weighted blend of peak, sustained, dropoff")
    dominant_emotion_overall: str = Field(..., description="Most frequent dominant ROI")
    roi_means: ROIMeans
    timeline: List[TimelinePoint]


# ---------------------------------------------------------------------------
# Mode 1: Single ad vs historical baseline
# ---------------------------------------------------------------------------

class BaselineMetric(BaseModel):
    """One metric compared against the historical average."""
    ad_value: float
    baseline: float
    delta: float = Field(..., description="ad_value - baseline")
    z_score: float = Field(..., description="Standard deviations from baseline mean")
    percentile: float = Field(..., ge=0, le=100, description="Percentile rank vs baseline")


class BaselineComparison(BaseModel):
    """Full comparison of one ad against the historical baseline."""
    ad_id: str
    verdict: str = Field(..., description="above_average | average | below_average")
    percentile: float = Field(..., description="Overall composite percentile")
    score_vs_baseline: Dict[str, BaselineMetric] = Field(
        ..., description="composite_score, peak_score, sustained_score, dropoff_penalty"
    )
    roi_vs_baseline: Dict[str, BaselineMetric] = Field(
        ..., description="Per-ROI delta vs historical average"
    )


class AnalyzeResponse(BaseModel):
    """Response for /analyze — one ad scored against historical average."""
    ad: AdScore
    vs_baseline: BaselineComparison
    llm_interpretation: Optional[str] = Field(
        None, description="Natural-language summary from LLM (when enabled)"
    )


# ---------------------------------------------------------------------------
# Mode 2: Two ads head-to-head (A/B test)
# ---------------------------------------------------------------------------

class ROIComparison(BaseModel):
    ad_a: float
    ad_b: float
    delta: float = Field(..., description="ad_a - ad_b")
    a_stronger: bool


class ABResult(BaseModel):
    """Pairwise Bayesian comparison between two ads."""
    ad_a: str
    ad_b: str
    P_A_wins_overall: float = Field(..., description="Fraction of timesteps where A > B")
    P_A_beats_B_peak_score: float
    P_A_beats_B_sustained_score: float
    P_A_beats_B_composite_score: float
    roi_comparison: Dict[str, ROIComparison]
    winner: str
    confidence: float = Field(..., description="0 = coin flip, 1 = certain")


class CompareResponse(BaseModel):
    """Response for /compare — two ads scored head-to-head."""
    ad_a: AdScore
    ad_b: AdScore
    ab_result: ABResult
    llm_interpretation: Optional[str] = None


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str
    service: str
    gpu: Optional[str] = None
