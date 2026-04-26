"""Merged schemas for the unified /analyze-full endpoint.

Combines SAM3 visual-segment results (VariantAnalysis) with TribeV2
brain-encoding results (BrainResult) into a single FullAnalysisResult
that the frontend can render across two tabs.
"""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from backend.models.schemas import (
    AudienceSegment,
    CampaignObjective,
    VariantAnalysis,
)


# ---------------------------------------------------------------------------
# TribeV2 passthrough shapes (mirrors app/schemas/models.py but standalone
# so we don't import torch/numpy-heavy deps on the local backend)
# ---------------------------------------------------------------------------

class RoiMeans(BaseModel):
    emotion: float
    language: float
    attention: float
    visual: float
    dmn: float


class TimelinePoint(BaseModel):
    second: float
    dominant_emotion: str
    posterior_P_convert: float
    roi_emotion: float
    roi_language: float
    roi_attention: float
    roi_visual: float
    roi_dmn: float


class BrainAdScore(BaseModel):
    ad_id: str
    T_seconds: int
    peak_score: float
    peak_second: float
    sustained_score: float
    dropoff_penalty: float
    composite_score: float
    dominant_emotion_overall: str
    roi_means: RoiMeans
    timeline: list[TimelinePoint]


class BaselineMetric(BaseModel):
    ad_value: float
    baseline: float
    delta: float
    z_score: float
    percentile: float


class BaselineComparison(BaseModel):
    ad_id: str
    verdict: str
    percentile: float
    score_vs_baseline: dict[str, BaselineMetric]
    roi_vs_baseline: dict[str, BaselineMetric]


class PillarScore(BaseModel):
    key: str
    label: str
    description: str
    score: float
    roi_contributions: dict[str, float]
    brain_regions: list[str]
    color: str


class PillarTimeline(BaseModel):
    second: float
    hook: float
    emotion: float
    persuasion: float
    memory: float
    sensory: float
    engagement: float


class BrainRegionActivation(BaseModel):
    roi: str
    label: str
    mean_activation: float
    peak_activation: float
    peak_second: float
    vertex_range: list[list[int]]


class BrainActivationData(BaseModel):
    n_vertices: int = 20484
    n_left: int = 10242
    n_right: int = 10242
    duration_seconds: int
    regions: list[BrainRegionActivation]
    vertex_activations_mean: list[float]
    vertex_activations_peak: list[float]


class AnalyzeResponse(BaseModel):
    """TribeV2 single-ad response."""
    ad: BrainAdScore
    vs_baseline: BaselineComparison
    pillars: list[PillarScore]
    pillar_timeline: list[PillarTimeline]
    brain: BrainActivationData
    llm_interpretation: str | None = None


class RoiComparison(BaseModel):
    ad_a: float
    ad_b: float
    delta: float
    a_stronger: bool


class ABResult(BaseModel):
    ad_a: str
    ad_b: str
    P_A_wins_overall: float
    P_A_beats_B_peak_score: float
    P_A_beats_B_sustained_score: float
    P_A_beats_B_composite_score: float
    roi_comparison: dict[str, RoiComparison]
    winner: str
    confidence: float


class CompareResponse(BaseModel):
    """TribeV2 two-ad head-to-head response."""
    ad_a: BrainAdScore
    ad_b: BrainAdScore
    ab_result: ABResult
    llm_interpretation: str | None = None


# ---------------------------------------------------------------------------
# Unified per-variant result (one entry per uploaded file)
# ---------------------------------------------------------------------------

class FullVariantResult(BaseModel):
    """Everything we know about one ad variant."""
    variant_id: str
    filename: str

    # Visual scoring (SAM3 + heuristic pipeline)
    visual: VariantAnalysis

    # Brain scoring (TribeV2 via Modal) — None when Modal is unreachable
    brain_single: AnalyzeResponse | None = None


# ---------------------------------------------------------------------------
# Top-level merged response
# ---------------------------------------------------------------------------

class FullAnalysisResult(BaseModel):
    """Unified response for POST /analyze-full."""

    mode: Literal["single", "compare"]

    # One entry per uploaded file
    variants: list[FullVariantResult]

    # Present only in compare mode
    brain_compare: CompareResponse | None = None

    # SAM3 comparison metadata (compare mode)
    objective: CampaignObjective | None = None
    audience_segment: AudienceSegment | None = None
    overall_winner: str | None = None
    objective_winner: str | None = None

    # Unified narrative (covers both systems)
    explanation: str = ""
    recommendations: list[str] = Field(default_factory=list)
    narrative_source: Literal["template", "llm"] = "template"
    narrative_model: str | None = None

    # Surfaced errors (non-fatal — e.g. Modal timeout)
    warnings: list[str] = Field(default_factory=list)
