from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


class CampaignObjective(str, Enum):
    clarity = "clarity"
    purchase = "purchase"
    engagement = "engagement"
    virality = "virality"


class AudienceSegment(str, Enum):
    budget_sensitive = "budget_sensitive"
    social_proof_driven = "social_proof_driven"
    viral_share_oriented = "viral_share_oriented"
    premium_brand_oriented = "premium_brand_oriented"


class VariantScore(BaseModel):
    purchase: float = Field(..., ge=0, le=100)
    engagement: float = Field(..., ge=0, le=100)
    virality: float = Field(..., ge=0, le=100)
    clarity: float = Field(..., ge=0, le=100)


class NeuralFeatures(BaseModel):
    attention_score: float = Field(..., ge=0, le=100)
    emotional_intensity: float = Field(..., ge=0, le=100)
    memory_signal: float = Field(..., ge=0, le=100)
    friction_score: float = Field(..., ge=0, le=100)
    predicted_attention_ms: float = Field(..., ge=0)


class AdSegment(BaseModel):
    label: str
    display_label: str | None = None
    pillar: str | None = None
    scoring_weight: float | None = None
    impact_score: float | None = None
    confidence: float = Field(..., ge=0, le=1)
    visual_weight_pct: float = Field(..., ge=0, le=100)
    brain_engagement_score: float | None = Field(default=None, ge=0, le=10)
    attention_score: float | None = Field(default=None, ge=0, le=10)
    reasoning: str
    geometry: dict[str, Any] | None = None


class VariantAnalysis(BaseModel):
    variant_id: str
    filename: str
    scores: VariantScore
    neural_features: NeuralFeatures
    segments: list[AdSegment]
    segments_source: Literal["mock", "sam3"] = "mock"
    roboflow_raw: dict[str, Any] | None = None
    pillar_scores: dict[str, float] | None = None
    pillar_breakdown: dict[str, Any] | None = None
    summary: str


class ComparisonResult(BaseModel):
    objective: CampaignObjective
    audience_segment: AudienceSegment
    variants: list[VariantAnalysis]
    overall_winner: str
    objective_winner: str
    explanation: str
    recommendations: list[str]
    copy_mode: Literal["neutral", "brain"] = "neutral"
    narrative_source: Literal["template", "llm"] = "template"
    narrative_model: str | None = None


class HealthResponse(BaseModel):
    status: str
    service: str
