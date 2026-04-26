"""Optional Pydantic AI: structured narrative on top of mock/heuristic variant metrics."""

from __future__ import annotations

import json
import logging
import os
from typing import Any

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class CompareNarrative(BaseModel):
    """LLM output validated by Pydantic; merged into ComparisonResult when generation succeeds."""

    unified_analysis: str = Field(..., min_length=50, description="Unified analysis combining CV and brain model insights into one cohesive summary")
    recommendations: list[str] = Field(..., min_length=2, max_length=8)


def _llm_credentials_present() -> bool:
    o = (os.environ.get("OPENAI_API_KEY") or "").strip()
    g = (os.environ.get("GOOGLE_API_KEY") or "").strip()
    return bool(o or g)


def _resolve_model_name() -> str | None:
    """
    Pick the Pydantic AI model string.

    - If PYDANTIC_AI_MODEL is set, use it (e.g. openai:gpt-4o-mini, google-gla:gemini-2.0-flash).
    - Else if only GOOGLE_API_KEY: default Gemini (Generative Language API).
    - Else if OPENAI_API_KEY (alone or with Google): default OpenAI mini.
    When both keys exist, set PYDANTIC_AI_MODEL explicitly to pick Gemini.
    """
    explicit = (os.environ.get("PYDANTIC_AI_MODEL") or "").strip()
    if explicit:
        return explicit
    has_openai = bool(os.environ.get("OPENAI_API_KEY"))
    has_google = bool(os.environ.get("GOOGLE_API_KEY"))
    if has_google and not has_openai:
        # Gemini model availability can vary by account; 2.5-flash is the safest default for new users.
        return os.environ.get("GEMINI_MODEL", "google-gla:gemini-2.5-flash")
    if has_openai:
        return "openai:gpt-4o-mini"
    return None


def _demo_mode_enabled() -> bool:
    return (os.environ.get("ARCA_NARRATIVE_DEMO_MODE") or "").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


async def enrich_comparison_narrative(
    *,
    objective_value: str,
    audience_value: str,
    variants_payload: list[dict[str, Any]],
    overall_winner: str,
    objective_winner: str,
) -> CompareNarrative | None:
    """
    If OPENAI_API_KEY or GOOGLE_API_KEY is set, run a Pydantic AI agent with structured output.

    Gemini: set GOOGLE_API_KEY (from AI Studio). Optional GEMINI_MODEL defaults to google-gla:gemini-2.0-flash.

    Returns None when no key, missing dependency, or the model run fails (caller keeps template copy).
    """
    if not _llm_credentials_present():
        # Allow a zero-cost demo path when quotas/billing are blocked.
        if not _demo_mode_enabled():
            return None

    model_name = _resolve_model_name()
    if not model_name:
        if _demo_mode_enabled():
            model_name = "test"
        else:
            return None

    try:
        from pydantic_ai import Agent
    except ImportError:
        return None

    agent = Agent(
        model_name,
        output_type=CompareNarrative,
        instructions=(
            "You are a neuro-marketing analyst for Arcanalytics. You receive detailed analysis data from both computer vision models and brain models. "
            "Your task is to provide a UNIFIED analysis that synthesizes insights from BOTH the CV and brain data into ONE cohesive summary.\n\n"
            "CV Data Includes: Visual segmentation, element weights, pillar scores, brand detection, CTA visibility, visual hierarchy.\n"
            "Brain Data Includes: Neural activation patterns, ROI engagement, limbic system response, neuromarketing pillars, emotional/cognitive processing.\n\n"
            "IMPORTANT: Do NOT separate these into different sections. Create ONE unified narrative that weaves together insights from both models. "
            "For example: 'The CV model shows strong brand prominence (18% visual weight) which correlates with the brain model's high hippocampus activation (0.082), indicating effective brand memory encoding.'\n\n"
            "Your unified analysis should:\n"
            "- Connect specific CV findings with corresponding brain responses\n"
            "- Explain how visual elements drive neural activation patterns\n"
            "- Identify which combinations of visual and neural factors drive performance\n"
            "- For comparisons: Explain which creative wins based on the combined CV+brain evidence\n\n"
            "CRITICAL: Always reference specific data points from BOTH models. Use actual scores, percentages, and activation values. "
            "Show how the visual and neural data tell a complete story together.\n\n"
            "Recommendations should be actionable improvements based on your unified analysis of both model outputs."
        ),
    )

    # Enhanced payload with detailed CV and brain model evaluation data
    payload = {
        "mode": "single" if len(variants_payload) == 1 else "compare",
        "objective": objective_value,
        "audience_segment": audience_value,
        "overall_winner": overall_winner,
        "objective_winner": objective_winner,
        "variants": variants_payload,
        "evaluation_context": {
            "cv_model_focus": [
                "visual_segmentation_accuracy",
                "element_weight_distribution", 
                "pillar_score_effectiveness",
                "visual_hierarchy_analysis",
                "brand_element_detection"
            ],
            "brain_model_focus": [
                "limbic_system_activation",
                "neural_engagement_patterns",
                "roi_activation_strength",
                "neuromarketing_pillar_performance",
                "emotional_cognitive_balance"
            ],
            "evaluation_criteria": {
                "cv_effectiveness": "How well visual elements support the campaign objective",
                "brain_effectiveness": "How neural patterns indicate persuasive impact",
                "cross_model_consistency": "Alignment between visual and neural measurements"
            }
        }
    }

    try:
        # Demo mode: use Pydantic AI's offline test model (no external calls).
        if _demo_mode_enabled():
            from pydantic_ai.models.test import TestModel

            agent = agent.override(model=TestModel())
        # IMPORTANT: FastAPI runs inside an event loop; using run_sync here will raise
        # "RuntimeError: This event loop is already running". Use the async runner instead.
        result = await agent.run(
            "Produce explanation and recommendations for this comparison snapshot:\n"
            f"{json.dumps(payload, indent=2)}"
        )
        return result.output
    except Exception as exc:
        # Without this log, Gemini/API failures look like "nothing happened" (template text stays).
        logger.warning(
            "Pydantic AI narrative skipped (template explanation/recommendations kept): %s: %s",
            type(exc).__name__,
            exc,
        )
        return None
