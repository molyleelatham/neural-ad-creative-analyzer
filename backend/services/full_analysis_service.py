"""Merged analysis service — runs SAM3 + TribeV2 in parallel.

This is the orchestrator for POST /analyze-full.  It:
  1. Runs the SAM3 visual-segment pipeline (existing compare_service)
  2. Simultaneously calls TribeV2 on Modal for brain scoring
  3. Optionally generates a unified AI narrative (Pydantic AI)
  4. Returns a FullAnalysisResult combining both

All TribeV2 failures are non-fatal: the response still contains the full
visual analysis, plus a warning string explaining what was skipped.
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

from backend.agents.attribution_agent import scores_from_neural
from backend.agents.neural_agent import mock_neural_features
from backend.agents.pydantic_ai_narrative import enrich_comparison_narrative
from backend.agents.sam3_agent import sam3_raw_for_image, sam3_segments_for_image
from backend.agents.segmentation_agent import mock_segments
from backend.models.merged_schemas import (
    AnalyzeResponse,
    CompareResponse,
    FullAnalysisResult,
    FullVariantResult,
)
from backend.models.schemas import (
    AudienceSegment,
    CampaignObjective,
    VariantAnalysis,
)
from backend.services.compare_service import (
    _build_summary,
    _build_recommendations,
    _compute_pillar_breakdown,
    _compute_pillar_scores,
    _explanation_from_metrics,
    _objective_score,
    _overall_score,
    _variant_summary_from_metrics,
)
from backend.services.tribev2_client import (
    modality_from_filename,
    tribev2_analyze_single,
    tribev2_compare,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Per-variant visual pipeline (SAM3 + mock neural)
# ---------------------------------------------------------------------------

async def _build_visual_variant(
    variant_id: str,
    filename: str,
    file_path: str | None,
    objective: CampaignObjective,
    audience_segment: AudienceSegment,
) -> VariantAnalysis:
    neural = mock_neural_features(filename)
    scores = scores_from_neural(neural)

    segments = None
    roboflow_raw = None
    segments_source = "mock"

    if file_path:
        segments = await sam3_segments_for_image(file_path)
        if segments:
            segments_source = "sam3"
            roboflow_raw = await sam3_raw_for_image(file_path)

    if not segments:
        segments = mock_segments()

    pillar_scores = _compute_pillar_scores(segments)
    pillar_breakdown = _compute_pillar_breakdown(segments)
    summary = _build_summary(variant_id, filename, objective, audience_segment)

    analysis = VariantAnalysis(
        variant_id=variant_id,
        filename=filename,
        scores=scores,
        neural_features=neural,
        segments=segments,
        segments_source=segments_source,
        roboflow_raw=roboflow_raw,
        pillar_scores=pillar_scores,
        pillar_breakdown=pillar_breakdown,
        summary=summary,
    )
    # Rewrite summary with real segment metrics
    analysis.summary = _variant_summary_from_metrics(analysis, objective, audience_segment)
    return analysis


# ---------------------------------------------------------------------------
# TribeV2 brain scoring (non-fatal wrappers)
# ---------------------------------------------------------------------------

async def _brain_single(
    file_bytes: bytes,
    filename: str,
) -> AnalyzeResponse | None:
    modality = modality_from_filename(filename)
    raw = await tribev2_analyze_single(
        file_bytes=file_bytes,
        filename=filename,
        modality=modality,
        ad_id=filename,
    )
    if raw is None:
        return None
    try:
        return AnalyzeResponse.model_validate(raw)
    except Exception as exc:
        logger.warning("Could not parse TribeV2 /analyze response: %s", exc)
        return None


async def _brain_compare(
    file_a_bytes: bytes,
    file_a_name: str,
    file_b_bytes: bytes,
    file_b_name: str,
) -> CompareResponse | None:
    modality = modality_from_filename(file_a_name)
    raw = await tribev2_compare(
        file_a_bytes=file_a_bytes,
        file_a_name=file_a_name,
        file_b_bytes=file_b_bytes,
        file_b_name=file_b_name,
        modality=modality,
        ad_a_id=file_a_name,
        ad_b_id=file_b_name,
    )
    if raw is None:
        return None
    try:
        return CompareResponse.model_validate(raw)
    except Exception as exc:
        logger.warning("Could not parse TribeV2 /compare response: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Narrative
# ---------------------------------------------------------------------------

async def _build_narrative(
    visual_analyses: list[VariantAnalysis],
    objective: CampaignObjective,
    audience: AudienceSegment,
    overall_winner: str,
    objective_winner: str,
    brain_data: dict[str, Any] | None,
) -> tuple[str, list[str], str, str | None]:
    """
    Returns (explanation, recommendations, narrative_source, narrative_model).

    Tries LLM first; falls back to template if unavailable.
    """
    # Template fallback
    objective_winner_analysis = next(
        (a for a in visual_analyses if a.variant_id == objective_winner),
        visual_analyses[0],
    )
    overall_winner_analysis = next(
        (a for a in visual_analyses if a.variant_id == overall_winner),
        visual_analyses[0],
    )

    template_explanation = _explanation_from_metrics(
        analyses=visual_analyses,
        objective=objective,
        audience=audience,
        objective_winner=objective_winner_analysis,
        overall_winner=overall_winner_analysis,
    )
    is_single = len(visual_analyses) == 1
    if is_single:
        template_recs = _build_recommendations(visual_analyses, objective, prefix="")
    else:
        template_recs = [
            f"Lead with {overall_winner} for general impact under {objective.value}.",
            f"Prioritize {objective_winner} when optimising strictly for {objective.value}.",
            *_build_recommendations(visual_analyses, objective),
        ]

    # Try LLM narrative
    narrative = await enrich_comparison_narrative(
        objective_value=objective.value,
        audience_value=audience.value,
        variants_payload=[a.model_dump(mode="json") for a in visual_analyses],
        overall_winner=overall_winner,
        objective_winner=objective_winner,
    )

    if narrative is not None:
        model_name = (os.environ.get("PYDANTIC_AI_MODEL") or "").strip() or None
        if not model_name and (os.environ.get("ARCA_NARRATIVE_DEMO_MODE") or "").strip().lower() in {
            "1", "true", "yes", "on",
        }:
            model_name = "test"
        return narrative.explanation, narrative.recommendations, "llm", model_name

    return template_explanation, template_recs, "template", None


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

async def run_full_analysis(
    variant_inputs: list[tuple[str, str, str | None, bytes]],
    objective: CampaignObjective,
    audience_segment: AudienceSegment,
) -> FullAnalysisResult:
    """
    Run the full merged pipeline.

    variant_inputs: list of (variant_id, original_filename, saved_file_path, raw_bytes)
      - variant_id: "v1", "v2", etc.
      - original_filename: as uploaded by the user
      - saved_file_path: path where the file was persisted (for SAM3)
      - raw_bytes: file content (for TribeV2 HTTP call)
    """
    warnings: list[str] = []
    mode: str = "single" if len(variant_inputs) == 1 else "compare"

    # ── 1. Visual pipeline (SAM3) — one per variant ─────────────────────
    visual_tasks = [
        _build_visual_variant(
            variant_id=vid,
            filename=fname,
            file_path=fpath,
            objective=objective,
            audience_segment=audience_segment,
        )
        for vid, fname, fpath, _ in variant_inputs
    ]
    visual_analyses: list[VariantAnalysis] = list(await asyncio.gather(*visual_tasks))

    # ── 2. Brain scoring (TribeV2 Modal) — run in parallel with nothing ─
    brain_singles: list[AnalyzeResponse | None] = [None] * len(variant_inputs)
    brain_compare_result: CompareResponse | None = None

    if mode == "single":
        vid, fname, _fpath, raw_bytes = variant_inputs[0]
        brain_singles[0] = await _brain_single(raw_bytes, fname)
        if brain_singles[0] is None:
            warnings.append(
                "Brain scoring (TribeV2) was unavailable or timed out — "
                "visual analysis is still complete."
            )
    else:
        # Run all single-ad brain scores + the head-to-head compare concurrently
        single_coros = [
            _brain_single(raw_bytes, fname)
            for _, fname, _, raw_bytes in variant_inputs
        ]
        # compare only meaningful for exactly 2; for 3+ we skip compare endpoint
        if len(variant_inputs) == 2:
            _, fname_a, _, bytes_a = variant_inputs[0]
            _, fname_b, _, bytes_b = variant_inputs[1]
            compare_coro = _brain_compare(bytes_a, fname_a, bytes_b, fname_b)
            results = await asyncio.gather(*single_coros, compare_coro)
            brain_singles = list(results[:-1])
            brain_compare_result = results[-1]
        else:
            brain_singles = list(await asyncio.gather(*single_coros))

        if all(b is None for b in brain_singles):
            warnings.append(
                "Brain scoring (TribeV2) was unavailable or timed out — "
                "visual analysis is still complete."
            )

    # ── 3. Pick overall/objective winners ───────────────────────────────
    objective_winner_analysis = max(
        visual_analyses, key=lambda a: _objective_score(a, objective)
    )
    overall_winner_analysis = max(
        visual_analyses, key=lambda a: _overall_score(a, objective)
    )

    # ── 4. Narrative ─────────────────────────────────────────────────────
    explanation, recommendations, narrative_source, narrative_model = (
        await _build_narrative(
            visual_analyses=visual_analyses,
            objective=objective,
            audience=audience_segment,
            overall_winner=overall_winner_analysis.variant_id,
            objective_winner=objective_winner_analysis.variant_id,
            brain_data=None,  # reserved for future cross-system enrichment
        )
    )

    # ── 5. Assemble FullVariantResult entries ───────────────────────────
    full_variants: list[FullVariantResult] = []
    for idx, (va, brain_single) in enumerate(zip(visual_analyses, brain_singles)):
        full_variants.append(
            FullVariantResult(
                variant_id=va.variant_id,
                filename=va.filename,
                visual=va,
                brain_single=brain_single,
            )
        )

    return FullAnalysisResult(
        mode=mode,
        variants=full_variants,
        brain_compare=brain_compare_result,
        objective=objective,
        audience_segment=audience_segment,
        overall_winner=overall_winner_analysis.variant_id,
        objective_winner=objective_winner_analysis.variant_id,
        explanation=explanation,
        recommendations=recommendations,
        narrative_source=narrative_source,
        narrative_model=narrative_model,
        warnings=warnings,
    )
