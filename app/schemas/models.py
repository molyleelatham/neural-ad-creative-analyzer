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
    image = "image"


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


# ---------------------------------------------------------------------------
# Neuromarketing pillars
# ---------------------------------------------------------------------------

class PillarScore(BaseModel):
    """One neuromarketing pillar score derived from ROI activations."""
    key: str = Field(..., description="Machine key e.g. hook, emotion, persuasion")
    label: str = Field(..., description="Human-readable label")
    description: str = Field(..., description="What this pillar measures")
    score: float = Field(..., description="Weighted blend of contributing ROIs (0-1)")
    roi_contributions: Dict[str, float] = Field(
        ..., description="Which ROIs feed this pillar and their weighted activation"
    )
    brain_regions: List[str] = Field(..., description="Anatomical areas involved")
    color: str = Field(..., description="Hex colour for UI rendering")


class PillarTimeline(BaseModel):
    """Per-second pillar activations for timeline charts."""
    second: float
    hook: float
    emotion: float
    persuasion: float
    memory: float
    sensory: float
    engagement: float


# ---------------------------------------------------------------------------
# Brain activation data (for 3D brain rendering in UI)
# ---------------------------------------------------------------------------

class BrainRegionActivation(BaseModel):
    """Activation summary for a single brain region / ROI."""
    roi: str = Field(..., description="ROI key (emotion, language, attention, visual, dmn)")
    label: str = Field(..., description="Human-readable region name")
    mean_activation: float = Field(..., description="Mean absolute activation across all timesteps")
    peak_activation: float = Field(..., description="Max activation across timesteps")
    peak_second: float = Field(..., description="When peak occurred")
    vertex_range: List[List[int]] = Field(
        ..., description="Vertex index ranges [[start,end], ...] on fsaverage5 mesh"
    )


class BrainActivationData(BaseModel):
    """Full brain activation payload — everything a UI needs to render a 3D brain."""
    n_vertices: int = Field(20484, description="Total vertices on fsaverage5 mesh")
    n_left: int = Field(10242, description="Left hemisphere vertex count")
    n_right: int = Field(10242, description="Right hemisphere vertex count")
    duration_seconds: int = Field(..., description="Total timesteps")
    regions: List[BrainRegionActivation] = Field(
        ..., description="Per-region activation summaries"
    )
    vertex_activations_mean: List[float] = Field(
        ..., description="Mean activation per vertex across time (length=n_vertices). "
        "Use this to colour the brain surface heatmap."
    )
    vertex_activations_peak: List[float] = Field(
        ..., description="Peak activation per vertex across time (length=n_vertices)"
    )


class AnalyzeResponse(BaseModel):
    """Response for /analyze — one ad scored against historical average."""
    ad: AdScore
    vs_baseline: BaselineComparison
    pillars: List[PillarScore] = Field(
        ..., description="Neuromarketing pillar breakdown"
    )
    pillar_timeline: List[PillarTimeline] = Field(
        ..., description="Per-second pillar activations for timeline charts"
    )
    brain: BrainActivationData = Field(
        ..., description="Vertex-level brain activation data for 3D rendering"
    )
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
