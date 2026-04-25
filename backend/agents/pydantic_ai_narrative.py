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

    explanation: str = Field(..., min_length=20)
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
            "You are an ad analytics strategist for Arcanalytics. "
            "You receive JSON with per-variant scores, mock neural features, and segment labels. "
            "Explain which variant wins for the stated objective and overall, referencing the numbers given. "
            "Do not invent new numeric scores. "
            "Recommendations must be short, actionable bullets for a marketing team."
        ),
    )

    payload = {
        "objective": objective_value,
        "audience_segment": audience_value,
        "overall_winner": overall_winner,
        "objective_winner": objective_winner,
        "variants": variants_payload,
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
