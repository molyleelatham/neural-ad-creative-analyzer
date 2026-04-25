from enum import Enum

from pydantic import BaseModel, Field


class CampaignObjective(str, Enum):
    purchase = "purchase"
    engagement = "engagement"
    virality = "virality"
    clarity = "clarity"


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
    confidence: float = Field(..., ge=0, le=1)
    visual_weight_pct: float = Field(..., ge=0, le=100)
    reasoning: str


class VariantAnalysis(BaseModel):
    variant_id: str
    filename: str
    scores: VariantScore
    neural_features: NeuralFeatures
    segments: list[AdSegment]
    summary: str


class ComparisonResult(BaseModel):
    objective: CampaignObjective
    audience_segment: AudienceSegment
    variants: list[VariantAnalysis]
    overall_winner: str
    objective_winner: str
    explanation: str
    recommendations: list[str]


class HealthResponse(BaseModel):
    status: str
    service: str
