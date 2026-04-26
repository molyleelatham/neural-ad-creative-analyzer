from agents.attribution_agent import scores_from_neural
from agents.neural_agent import mock_neural_features
from agents.pydantic_ai_narrative import enrich_comparison_narrative
import os
from agents.segmentation_agent import mock_segments
import csv
from pathlib import Path

from agents.sam3_agent import sam3_raw_for_file, sam3_segments_for_file
from models.schemas import (
    AudienceSegment,
    CampaignObjective,
    ComparisonResult,
    AdSegment,
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
        f"Analysis for {variant_id} ({filename}) tuned for {objective.value} "
        f"among {audience.value.replace('_', ' ')} users."
    )


def _fmt_labels(labels: list[str]) -> str:
    if not labels:
        return "—"
    if len(labels) == 1:
        return labels[0]
    if len(labels) == 2:
        return f"{labels[0]} and {labels[1]}"
    return f"{', '.join(labels[:-1])}, and {labels[-1]}"


def _segment_impact(seg: AdSegment) -> float | None:
    """
    Converts remap scoring_weight + geometry share into an "impact" scalar.

    impact = scoring_weight * (visual_weight_pct/100) * confidence
    """
    if seg.scoring_weight is None:
        return None
    return float(seg.scoring_weight) * (float(seg.visual_weight_pct) / 100.0) * float(seg.confidence)


def _annotate_impacts(segments: list[AdSegment]) -> None:
    for s in segments:
        s.impact_score = _segment_impact(s)


def _top_impacts(segments: list[AdSegment], *, positive: bool, n: int = 2) -> list[AdSegment]:
    vals = [s for s in segments if s.impact_score is not None]
    if positive:
        vals = [s for s in vals if (s.impact_score or 0.0) >= 0.0]
        return sorted(vals, key=lambda s: s.impact_score or 0.0, reverse=True)[:n]
    vals = [s for s in vals if (s.impact_score or 0.0) < 0.0]
    return sorted(vals, key=lambda s: abs(s.impact_score or 0.0), reverse=True)[:n]


def _seg_name(seg: AdSegment) -> str:
    return (seg.display_label or "").strip() or seg.label


_WEIGHTINGS_CACHE: tuple[Path, dict[str, dict[str, object]]] | None = None


def _load_weightings() -> dict[str, dict[str, object]]:
    """
    Loads weightings from backend/weightings.csv (or ARCA_CLASS_REMAP_PATH if set),
    keyed by label/original_class/roboflow_label.
    """
    global _WEIGHTINGS_CACHE
    raw_path = (os.environ.get("ARCA_CLASS_REMAP_PATH") or "").strip()
    path = Path(raw_path) if raw_path else (Path(__file__).resolve().parents[1] / "weightings.csv")

    if _WEIGHTINGS_CACHE is not None and _WEIGHTINGS_CACHE[0] == path:
        return _WEIGHTINGS_CACHE[1]

    def _parse_weight(x: str) -> float:
        s = (x or "").strip().replace("%", "")
        try:
            return float(s)
        except Exception:
            return 0.0

    mapping: dict[str, dict[str, object]] = {}
    try:
        if path.exists():
            with path.open("r", encoding="utf-8", newline="") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    label = (row.get("original_class") or "").strip()
                    rf = (row.get("roboflow_label") or label).strip()
                    if not (label or rf):
                        continue
                    meta = {
                        "display_label": (row.get("display_name") or "").strip() or None,
                        "pillar": (row.get("pillar") or "").strip() or None,
                        "scoring_weight": _parse_weight(row.get("scoring_weight") or "0"),
                    }
                    # Index by BOTH original_class and roboflow_label so either can match.
                    if label:
                        mapping[label.strip().lower()] = meta
                    if rf:
                        mapping[rf.strip().lower()] = meta
    except Exception:
        mapping = {}

    _WEIGHTINGS_CACHE = (path, mapping)
    return mapping


def _segment_strength(seg: AdSegment) -> float:
    """
    0..100 strength of element presence in the creative.
    Uses confidence as the base signal and geometry share as a bonus.

    The previous formula (share * confidence) produced unrealistically tiny values.
    """
    conf = max(0.0, min(1.0, float(seg.confidence)))
    share = max(0.0, min(100.0, float(seg.visual_weight_pct)))
    # Treat ~20% share as "fully present" for the size component.
    size_factor = max(0.0, min(1.0, share / 20.0))
    strength = 100.0 * (0.7 * conf + 0.3 * size_factor)
    return max(0.0, min(100.0, strength))


def _compute_pillar_scores(segments: list[AdSegment]) -> dict[str, float]:
    """
    Pillar score (0..100) per pillar, using the weightings sheet.

    Positive weights are normalized to sum to 100 within each pillar.
    Negative weights act as penalties on the same scale.
    """
    wmap = _load_weightings()

    # Ensure segments have metadata even if coming from mocks.
    for s in segments:
        key = (s.label or "").strip().lower()
        meta = wmap.get(key)
        if meta:
            if not s.display_label:
                s.display_label = meta.get("display_label")  # type: ignore[assignment]
            if not s.pillar:
                s.pillar = meta.get("pillar")  # type: ignore[assignment]
            if s.scoring_weight is None:
                s.scoring_weight = float(meta.get("scoring_weight") or 0.0)  # type: ignore[arg-type]

    # Collect weights by pillar from the sheet (not only detected segments).
    by_pillar: dict[str, list[tuple[str, float]]] = {}
    for key, meta in wmap.items():
        pillar = (meta.get("pillar") or "").__str__().strip()
        if not pillar:
            continue
        w = float(meta.get("scoring_weight") or 0.0)
        by_pillar.setdefault(pillar, []).append((str(key), w))

    # Index strengths by label
    strengths: dict[str, float] = {(s.label or "").strip().lower(): _segment_strength(s) for s in segments}

    pillar_scores: dict[str, float] = {}
    for pillar, items in by_pillar.items():
        pos_total = sum(w for _, w in items if w > 0) or 1.0
        score = 0.0
        for label, w in items:
            strength = strengths.get(label, 0.0)
            if w >= 0:
                score += (w / pos_total) * strength
            else:
                score -= (abs(w) / pos_total) * strength
        pillar_scores[pillar] = max(0.0, min(100.0, round(score, 2)))

    return pillar_scores


def _compute_pillar_breakdown(segments: list[AdSegment]) -> dict[str, dict[str, object]]:
    """
    Returns per-pillar details showing what affected the score.

    Every factor from weightings.csv is considered; missing ones have strength 0.
    """
    wmap = _load_weightings()

    # Strength index for detected segments
    strengths: dict[str, float] = {(s.label or "").strip().lower(): _segment_strength(s) for s in segments}

    # Group all sheet rows by pillar
    by_pillar: dict[str, list[tuple[str, dict[str, object]]]] = {}
    for key, meta in wmap.items():
        pillar = (meta.get("pillar") or "").__str__().strip()
        if not pillar:
            continue
        by_pillar.setdefault(pillar, []).append((str(key), meta))

    out: dict[str, dict[str, object]] = {}
    for pillar, items in by_pillar.items():
        pos_total = sum(float(meta.get("scoring_weight") or 0.0) for _, meta in items if float(meta.get("scoring_weight") or 0.0) > 0) or 1.0

        factors: list[dict[str, object]] = []
        for label, meta in items:
            w = float(meta.get("scoring_weight") or 0.0)
            strength = float(strengths.get(label, 0.0))
            norm = (abs(w) / pos_total) if pos_total else 0.0
            contribution = (norm * strength) if w >= 0 else (-norm * strength)
            factors.append(
                {
                    "roboflow_label": label,
                    "display_name": meta.get("display_label"),
                    "scoring_weight": w,
                    "strength": round(strength, 2),
                    "contribution": round(contribution, 2),
                }
            )

        drivers = sorted([f for f in factors if float(f["contribution"]) > 0], key=lambda f: float(f["contribution"]), reverse=True)
        drags = sorted([f for f in factors if float(f["contribution"]) < 0], key=lambda f: abs(float(f["contribution"])), reverse=True)

        # Missing high-weight positives (strength=0)
        missing = sorted(
            [f for f in factors if float(f["strength"]) == 0.0 and float(f["scoring_weight"]) > 0],
            key=lambda f: float(f["scoring_weight"]),
            reverse=True,
        )

        out[pillar] = {
            "drivers": drivers[:3],
            "drags": drags[:2],
            "missing": missing[:3],
        }

    return out


def _variant_summary_from_metrics(
    analysis: VariantAnalysis,
    objective: CampaignObjective,
    audience: AudienceSegment,
) -> str:
    segs = analysis.segments or []
    _annotate_impacts(segs)
    w_product = _segment_weight(segs, "product")
    w_cta = _segment_weight(segs, "cta_button")
    w_headline = _segment_weight(segs, "headline_text")
    w_logo = _segment_weight(segs, "brand_logo")
    w_person = _segment_weight(segs, "person")
    w_bg = _segment_weight(segs, "background")

    top = _top_labels(segs, 3)
    obj_score = _objective_score(analysis, objective)
    drivers = _top_impacts(segs, positive=True, n=1)
    drags = _top_impacts(segs, positive=False, n=1)

    callouts: list[str] = []
    if w_cta <= 0:
        callouts.append("CTA not detected")
    elif w_cta < 6:
        callouts.append(f"CTA is small ({w_cta:.0f}%)")
    else:
        callouts.append(f"CTA share {w_cta:.0f}%")

    if w_headline > 25:
        callouts.append(f"text-heavy ({w_headline:.0f}% headline)")
    if w_bg > 45:
        callouts.append(f"background-dominant ({w_bg:.0f}%)")
    if w_product > 0:
        callouts.append(f"product share {w_product:.0f}%")
    if w_logo > 0 and w_logo < 3:
        callouts.append(f"small logo ({w_logo:.0f}%)")
    if w_person > 0:
        callouts.append(f"person present ({w_person:.0f}%)")

    # Keep concise: 1–2 callouts max.
    short_callouts = ", ".join(callouts[:2]) if callouts else "balanced composition"
    top_str = _fmt_labels(top)
    aud = audience.value.replace("_", " ")

    driver_str = (
        f"Top driver: {_seg_name(drivers[0])} (+{(drivers[0].impact_score or 0.0):.1f})." if drivers else ""
    )
    drag_str = (
        f"Top drag: {_seg_name(drags[0])} ({(drags[0].impact_score or 0.0):.1f})." if drags else ""
    )
    tail = " ".join([x for x in [driver_str, drag_str] if x]).strip()

    return (
        f"{analysis.variant_id}: Objective score {obj_score:.1f} for {objective.value} ({aud}). "
        f"Top elements: {top_str}. Signals: {short_callouts}."
        + (f" {tail}" if tail else "")
    )


def _explanation_from_metrics(
    analyses: list[VariantAnalysis],
    objective: CampaignObjective,
    audience: AudienceSegment,
    objective_winner: VariantAnalysis,
    overall_winner: VariantAnalysis,
) -> str:
    aud = audience.value.replace("_", " ")
    ow = overall_winner
    cw = objective_winner

    if len(analyses) == 1:
        v = analyses[0]
        obj = _objective_score(v, objective)
        pillars = ["Attention", "Emotion", "Trust", "Clarity", "Urgency"]
        lines: list[str] = []
        for p in pillars:
            score = (v.pillar_scores or {}).get(p)
            if score is None:
                continue
            bd = (v.pillar_breakdown or {}).get(p) if isinstance(v.pillar_breakdown, dict) else None
            helped = ""
            hurt = ""
            missing = ""
            if isinstance(bd, dict):
                drivers = bd.get("drivers") or []
                drags = bd.get("drags") or []
                miss = bd.get("missing") or []
                if drivers:
                    d0 = drivers[0]
                    helped = f" helped by {d0.get('display_name') or d0.get('roboflow_label')}"
                if drags:
                    x0 = drags[0]
                    hurt = f", hurt by {x0.get('display_name') or x0.get('roboflow_label')}"
                if miss:
                    m0 = miss[0]
                    missing = f", missing {m0.get('display_name') or m0.get('roboflow_label')}"
            lines.append(f"{p} {float(score):.1f}/100{helped}{hurt}{missing}.")

        pillar_blob = " ".join(lines).strip()
        return (
            f"This is a single-ad review for '{objective.value}' with audience '{aud}'. "
            f"Objective score: {obj:.1f}. "
            f"{pillar_blob} "
            f"Use the pillar breakdown below to decide what to change first (usually CTA clarity + attention hierarchy)."
        )

    def _headline(a: VariantAnalysis) -> str:
        segs = a.segments or []
        _annotate_impacts(segs)
        w_cta = _segment_weight(segs, "cta_button")
        w_headline = _segment_weight(segs, "headline_text")
        w_product = _segment_weight(segs, "product")
        w_bg = _segment_weight(segs, "background")
        top = _top_labels(segs, 2)
        top_str = _fmt_labels(top)
        drivers = _top_impacts(segs, positive=True, n=2)
        drags = _top_impacts(segs, positive=False, n=2)
        bits: list[str] = [f"top: {top_str}"]
        if w_cta > 0:
            bits.append(f"CTA {w_cta:.0f}%")
        else:
            bits.append("CTA missing")
        if w_product > 0:
            bits.append(f"product {w_product:.0f}%")
        if w_headline > 0:
            bits.append(f"headline {w_headline:.0f}%")
        if w_bg > 0:
            bits.append(f"bg {w_bg:.0f}%")
        core = ", ".join(bits[:4])

        def _fmt_impacts(xs: list[AdSegment], sign: str) -> str:
            parts: list[str] = []
            for s in xs:
                val = s.impact_score or 0.0
                parts.append(f"{_seg_name(s)} ({sign}{abs(val):.1f})")
            return "; ".join(parts)

        drv = _fmt_impacts(drivers, "+")
        drg = _fmt_impacts(drags, "-")
        extras: list[str] = []
        if drv:
            extras.append(f"drivers: {drv}")
        if drg:
            extras.append(f"drags: {drg}")
        return core + (f". {' | '.join(extras)}" if extras else "")

    return (
        f"Compared {len(analyses)} variants for '{objective.value}' with audience '{aud}'. "
        f"Objective winner: {cw.variant_id} ({_objective_score(cw, objective):.1f}). "
        f"Overall winner: {ow.variant_id} ({_overall_score(ow, objective):.1f}). "
        f"{ow.variant_id} breakdown: {_headline(ow)}. "
        f"Biggest lever tends to be CTA/headline balance—use the element weights above to iterate."
    )


def _segment_weight(segments: list[AdSegment], label: str) -> float:
    for s in segments:
        if s.label == label:
            return float(s.visual_weight_pct)
    return 0.0


def _top_labels(segments: list[AdSegment], n: int = 3) -> list[str]:
    return [s.label for s in sorted(segments, key=lambda x: x.visual_weight_pct, reverse=True)[:n]]


def _build_recommendations(
    analyses: list[VariantAnalysis],
    objective: CampaignObjective,
    *,
    prefix: str | None = None,
) -> list[str]:
    # Generate recommendations driven by segment weights + objective score.
    recs: list[str] = []
    for a in analyses:
        pfx = prefix if prefix is not None else f"{a.variant_id}: "
        segs = a.segments or []
        w_product = _segment_weight(segs, "product")
        w_cta = _segment_weight(segs, "cta_button")
        w_headline = _segment_weight(segs, "headline_text")
        w_logo = _segment_weight(segs, "brand_logo")
        w_person = _segment_weight(segs, "person")
        w_bg = _segment_weight(segs, "background")
        top = _top_labels(segs, 3)
        before = len(recs)

        # CTA guidance
        if w_cta <= 0.0:
            recs.append(f"{pfx}Add a clear CTA button element (it isn't being detected).")
        elif w_cta < 6.0:
            recs.append(f"{pfx}CTA is easy to miss ({w_cta:.0f}% weight). Increase size/contrast or move closer to the focal area.")

        # Clarity guidance from headline dominance removed

        # Brand guidance
        if objective in {CampaignObjective.purchase, CampaignObjective.clarity} and w_logo < 3.0 and w_logo > 0.0:
            recs.append(f"{pfx}Brand mark is present but small ({w_logo:.0f}%). Consider making it more legible without stealing focus.")

        # Product focus
        if objective == CampaignObjective.purchase and w_product < 12.0 and w_product > 0.0:
            recs.append(f"{pfx}Product presence is low ({w_product:.0f}%). Make the product more central or increase its visual share.")

        # Background waste removed

        # If nothing triggered, provide a simple, data-based nudge.
        if len(recs) == before:
            recs.append(f"{pfx}Strongest elements are {', '.join(top) if top else '—'}. Keep the focal hierarchy, then test CTA copy/placement.")

        # Ensure we can always show at least 3 fixes in SINGLE mode.
        # We keep these metric-driven but slightly more general.
        local = recs[before:]
        if len(local) < 3:
            if w_headline <= 0.0:
                local.append(f"{pfx}Add a short headline or hook (no headline_text detected).")
            elif w_headline < 8.0:
                local.append(f"{pfx}Make the hook more legible (headline weight {w_headline:.0f}%).")

            if w_product <= 0.0:
                local.append(f"{pfx}Make the product/offer obvious (no product_shot detected).")
            elif objective == CampaignObjective.purchase and w_product < 12.0:
                local.append(f"{pfx}Increase product presence (product weight {w_product:.0f}%) to support purchase intent.")

            if w_logo <= 0.0:
                local.append(f"{pfx}Add a clear brand mark for trust/recall (brand_logo not detected).")

            # Absolute fallback: testing-oriented, still actionable.
            if len(local) < 3:
                local.append(f"{pfx}Run a quick A/B on CTA copy + placement (same creative, one variable).")

            # Replace the slice in recs with the extended local list.
            recs = recs[:before] + local

    # De-duplicate while keeping order.
    seen: set[str] = set()
    out: list[str] = []
    for r in recs:
        if r not in seen:
            seen.add(r)
            out.append(r)
    # UI expects 3 items; guarantee at least 3 for single-ad.
    if len(analyses) == 1 and len(out) < 3:
        while len(out) < 3:
            out.append("Test one change at a time and re-upload to confirm lift.")
    return out[:8]


async def analyze_variants(
    variant_inputs: list[tuple[str, str, str | None]],
    objective: CampaignObjective,
    audience_segment: AudienceSegment,
) -> ComparisonResult:
    """
    Run mock pipeline per variant.

    variant_inputs: list of (variant_id, original_filename) for display and deterministic mocks.
    """
    # Collapse duplicate uploads (e.g. single-ad UI sending the same file twice).
    # Dedupe on saved file path when available; otherwise fall back to filename.
    deduped_inputs: list[tuple[str, str, str | None]] = []
    seen_keys: set[str] = set()
    for _variant_id, filename, file_path in variant_inputs:
        key = (file_path or "").strip() or f"fn:{(filename or '').strip()}"
        if not key:
            continue
        if key in seen_keys:
            continue
        seen_keys.add(key)
        deduped_inputs.append((_variant_id, filename, file_path))
    variant_inputs = [(f"v{idx + 1}", fn, fp) for idx, (_, fn, fp) in enumerate(deduped_inputs)]

    analyses: list[VariantAnalysis] = []
    for variant_id, filename, file_path in variant_inputs:
        neural = mock_neural_features(filename)
        scores = scores_from_neural(neural)
        segments = None
        roboflow_raw = None
        segments_source = "mock"
        if file_path:
            segments = await sam3_segments_for_file(file_path)
            if segments:
                roboflow_raw = await sam3_raw_for_file(file_path)
        if not segments:
            segments = mock_segments()
        else:
            segments_source = "sam3"
        analyses.append(
            VariantAnalysis(
                variant_id=variant_id,
                filename=filename,
                scores=scores,
                neural_features=neural,
                segments=segments,
                segments_source=segments_source,
                roboflow_raw=roboflow_raw,
                pillar_scores=_compute_pillar_scores(segments),
                pillar_breakdown=_compute_pillar_breakdown(segments),
                summary=_build_summary(variant_id, filename, objective, audience_segment),
            )
        )

    # Rewrite per-variant summary based on the actual segment metrics/scores.
    for a in analyses:
        a.summary = _variant_summary_from_metrics(a, objective, audience_segment)

    objective_winner = max(analyses, key=lambda a: _objective_score(a, objective))
    overall_winner = max(analyses, key=lambda a: _overall_score(a, objective))

    is_single = len(analyses) == 1
    if is_single:
        recs = _build_recommendations(analyses, objective, prefix="")
    else:
        recs = [
            f"Lead with {overall_winner.variant_id} for general impact under {objective.value}.",
            f"Prioritize {objective_winner.variant_id} when optimizing strictly for {objective.value}.",
            *_build_recommendations(analyses, objective),
        ]

    explanation = _explanation_from_metrics(
        analyses=analyses,
        objective=objective,
        audience=audience_segment,
        objective_winner=objective_winner,
        overall_winner=overall_winner,
    )

    narrative_source = "template"
    narrative_model: str | None = None
    narrative = await enrich_comparison_narrative(
        objective_value=objective.value,
        audience_value=audience_segment.value,
        variants_payload=[a.model_dump(mode="json") for a in analyses],
        overall_winner=overall_winner.variant_id,
        objective_winner=objective_winner.variant_id,
    )
    if narrative is not None:
        explanation = narrative.explanation
        recs = narrative.recommendations
        narrative_source = "llm"
        narrative_model = (os.environ.get("PYDANTIC_AI_MODEL") or "").strip() or None
        if not narrative_model:
            if (os.environ.get("ARCA_NARRATIVE_DEMO_MODE") or "").strip().lower() in {
                "1",
                "true",
                "yes",
                "on",
            }:
                narrative_model = "test"

    copy_mode_raw = (os.environ.get("ARCA_COPY_MODE") or "").strip().lower()
    copy_mode: str = "brain" if copy_mode_raw in {"brain", "tribe", "tribe_v2", "v2"} else "neutral"

    return ComparisonResult(
        objective=objective,
        audience_segment=audience_segment,
        variants=analyses,
        overall_winner=overall_winner.variant_id,
        objective_winner=objective_winner.variant_id,
        explanation=explanation,
        recommendations=recs,
        copy_mode=copy_mode,  # drives UI phrasing; set ARCA_COPY_MODE=brain for Tribe v2
        narrative_source=narrative_source,
        narrative_model=narrative_model,
    )
