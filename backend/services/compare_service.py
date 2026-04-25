from backend.agents.attribution_agent import scores_from_neural
from backend.agents.neural_agent import mock_neural_features
from backend.agents.segmentation_agent import mock_segments
from backend.models.schemas import (
    AudienceSegment,
    CampaignObjective,
    ComparisonResult,
    VariantAnalysis,
)


def _objective_score(analysis: VariantAnalysis, objective: CampaignObjective) -> float:
    s = analysis.scores
    mapping = {
        CampaignObjective.purchase: s.purchase,
        CampaignObjective.engagement: s.engagement,
        CampaignObjective.virality: s.virality,
        CampaignObjective.clarity: s.clarity,
    }
    return mapping[objective]


def _overall_score(analysis: VariantAnalysis, objective: CampaignObjective) -> float:
    """Blend objective weighting with general quality for overall winner."""
    s = analysis.scores
    obj = _objective_score(analysis, objective)
    blend = 0.55 * obj + 0.15 * s.purchase + 0.15 * s.engagement + 0.15 * s.clarity
    return blend


def _build_summary(
    variant_id: str,
    filename: str,
    objective: CampaignObjective,
    audience: AudienceSegment,
) -> str:
    return (
        f"Mock analysis for {variant_id} ({filename}) tuned for {objective.value} "
        f"among {audience.value.replace('_', ' ')} users."
    )


def analyze_variants(
    variant_inputs: list[tuple[str, str]],
    objective: CampaignObjective,
    audience_segment: AudienceSegment,
) -> ComparisonResult:
    """
    Run mock pipeline per variant.

    variant_inputs: list of (variant_id, original_filename) for display and deterministic mocks.
    """
    analyses: list[VariantAnalysis] = []
    for variant_id, filename in variant_inputs:
        neural = mock_neural_features(filename)
        scores = scores_from_neural(neural)
        segments = mock_segments()
        analyses.append(
            VariantAnalysis(
                variant_id=variant_id,
                filename=filename,
                scores=scores,
                neural_features=neural,
                segments=segments,
                summary=_build_summary(variant_id, filename, objective, audience_segment),
            )
        )

    objective_winner = max(analyses, key=lambda a: _objective_score(a, objective))
    overall_winner = max(analyses, key=lambda a: _overall_score(a, objective))

    recs = [
        f"Lead with {overall_winner.variant_id} for general impact under {objective.value}.",
        f"Prioritize {objective_winner.variant_id} when optimizing strictly for {objective.value}.",
        "Replace mock agents with production models before launch.",
    ]

    explanation = (
        f"Compared {len(analyses)} variants for objective '{objective.value}' "
        f"and audience '{audience_segment.value}'. "
        f"Best on objective: {objective_winner.variant_id} "
        f"({_objective_score(objective_winner, objective):.1f}). "
        f"Best overall blend: {overall_winner.variant_id}."
    )

    return ComparisonResult(
        objective=objective,
        audience_segment=audience_segment,
        variants=analyses,
        overall_winner=overall_winner.variant_id,
        objective_winner=objective_winner.variant_id,
        explanation=explanation,
        recommendations=recs,
    )
