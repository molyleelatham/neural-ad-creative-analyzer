"""ROI configuration for mapping TribeV2 vertices to functional brain systems.

TribeV2 outputs predictions on an fsaverage5 mesh: 10,242 vertices per hemisphere,
20,484 total.  Left hemisphere = indices 0..10,241; right = 10,242..20,483.

The vertex ranges below are coarse approximations of where HCP parcellation
regions fall on the fsaverage5 surface.  When running on Modal with full
dependencies (mne, nilearn) these can be replaced with exact indices from
``tribev2.utils.get_hcp_roi_indices``.

Each functional system aggregates several HCP parcels that jointly encode a
cognitive/affective function relevant to ad scoring.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Tuple

# ---------------------------------------------------------------------------
# Functional ROI → vertex index ranges on fsaverage5 (20,484 total)
#
# These are organised by the cognitive function they proxy, not by raw
# anatomy.  Each tuple is (start_inclusive, end_inclusive).
#
# Left hemisphere:  0 – 10,241
# Right hemisphere: 10,242 – 20,483
# ---------------------------------------------------------------------------

ROI_VERTEX_RANGES: Dict[str, List[Tuple[int, int]]] = {
    # Emotion / limbic — amygdala-adjacent cortex, insula, OFC, anterior
    # cingulate.  Bilateral: medial temporal + insular regions.
    "emotion": [
        (4000, 5500),       # left medial-temporal / amygdala-adj
        (14242, 15742),     # right mirror
    ],
    # Language — Broca (44/45) + Wernicke + superior temporal sulcus.
    # Primarily left-lateralised.
    "language": [
        (0, 2500),          # left perisylvian / inferior frontal
        (2500, 4000),       # left posterior temporal
        (10242, 12000),     # right homologues (weaker)
    ],
    # Attention — dorsal attention network: FEF, intraparietal sulcus,
    # superior parietal lobule.  Bilateral.
    "attention": [
        (7000, 9000),       # left dorsal parietal / FEF
        (17242, 19242),     # right mirror
    ],
    # Visual — early visual cortex (V1-V4, MT/MST).  Bilateral, posterior.
    "visual": [
        (9000, 10241),      # left occipital pole
        (19242, 20483),     # right occipital pole
    ],
    # Default-mode network (DMN) — mPFC, PCC, angular gyrus, hippocampal.
    # High DMN = mind-wandering / disengagement from the ad.
    "dmn": [
        (5500, 7000),       # left mPFC / PCC
        (15742, 17242),     # right mirror
    ],
}


# ---------------------------------------------------------------------------
# Bayesian likelihood tables — from neuromarketing literature
# ---------------------------------------------------------------------------

# P(Emotion | Convert): how predictive is each ROI signal of a conversion?
EMOTION_LIKELIHOODS: Dict[str, float] = {
    "emotion":   0.85,
    "language":  0.78,
    "attention": 0.60,
    "visual":    0.45,
    "dmn":       0.15,
}

# P(Emotion): base rate of seeing this signal across all content
EMOTION_MARGINALS: Dict[str, float] = {
    "emotion":   0.30,
    "language":  0.35,
    "attention": 0.50,
    "visual":    0.60,
    "dmn":       0.40,
}


# ---------------------------------------------------------------------------
# HCP parcels that map to each functional system (for exact lookups when
# mne is available).  Used by neuro_mapping.py as a fallback / reference.
# ---------------------------------------------------------------------------

HCP_PARCEL_GROUPS: Dict[str, List[str]] = {
    "emotion": [
        "OFC", "pOFC", "10r", "10v", "11l", "13l",   # orbital frontal
        "Ig", "Id",                                     # insula granular
        "PoI1", "PoI2", "FOP4", "MI",                 # frontal operculum
        "a24", "p24", "25", "s32", "p32",              # anterior cingulate
    ],
    "language": [
        "44", "45", "47l", "IFSp", "IFSa", "IFJa",   # Broca's
        "A4", "A5", "STSdp", "STSda", "STSvp",        # superior temporal
        "TPOJ1", "TPOJ2", "TPOJ3",                    # temporo-parietal
        "STV", "PSL",                                   # planum
    ],
    "attention": [
        "FEF", "PEF",                                  # frontal eye fields
        "AIP", "LIPd", "LIPv", "VIP", "MIP",          # intraparietal sulcus
        "7AL", "7Am", "7PL", "7PM",                    # superior parietal
    ],
    "visual": [
        "V1", "V2", "V3", "V3A", "V3B", "V3CD",
        "V4", "V4t", "V6", "V6A", "V7", "V8",
        "MT", "MST", "FST", "LO1", "LO2", "LO3",
        "PIT", "FFC", "VVC", "VMV1", "VMV2", "VMV3",
    ],
    "dmn": [
        "10d", "10pp", "10v", "9m", "9p", "9a",       # medial prefrontal
        "d32", "a24", "p24",                            # cingulate
        "PCV", "RSC", "7m", "POS1", "POS2",           # posterior cingulate
        "PGi", "PGs", "PFm",                           # angular gyrus
        "PreS", "EC", "H",                              # hippocampal
    ],
}


# ---------------------------------------------------------------------------
# Historical baseline — "average ad" profile
#
# These represent what a typical/median piece of ad content looks like when
# run through the TribeV2 → Bayesian scoring pipeline.  A single uploaded ad
# is compared against these numbers to produce percentile and delta scores.
#
# Values are calibrated from the scorer's Bayesian update dynamics with
# balanced ROI activation (no single dominant system).  Adjust as you
# accumulate real data from your ad library.
# ---------------------------------------------------------------------------

HISTORICAL_BASELINE: Dict[str, float] = {
    # Bayesian composite scores for a "median" ad
    "composite_score": 0.35,
    "peak_score":      0.45,
    "sustained_score": 0.25,
    "dropoff_penalty": 0.08,
    # Mean ROI activations for a balanced stimulus
    "roi_emotion":     0.12,
    "roi_language":    0.10,
    "roi_attention":   0.11,
    "roi_visual":      0.13,
    "roi_dmn":         0.09,
}

# Approximate standard deviations for each metric — used to convert
# raw deltas into z-scores and percentiles.
HISTORICAL_BASELINE_STD: Dict[str, float] = {
    "composite_score": 0.15,
    "peak_score":      0.18,
    "sustained_score": 0.12,
    "dropoff_penalty": 0.05,
    "roi_emotion":     0.06,
    "roi_language":    0.05,
    "roi_attention":   0.05,
    "roi_visual":      0.06,
    "roi_dmn":         0.04,
}


# ---------------------------------------------------------------------------
# Neuromarketing Pillars — group ROIs into actionable dimensions
#
# Each pillar maps to one or more low-level ROIs and carries a human-readable
# label + description for UI rendering.  The ``roi_weights`` dict controls
# how ROI activations are blended into the pillar score (must sum to 1).
# ---------------------------------------------------------------------------

@dataclass
class PillarDef:
    """Definition of a single neuromarketing pillar."""
    key: str
    label: str
    description: str
    roi_weights: Dict[str, float]          # ROI → weight (sum to 1)
    brain_regions: List[str]               # human-readable anatomy
    color: str                             # hex colour for UI rendering


PILLAR_DEFS: List[PillarDef] = [
    PillarDef(
        key="hook",
        label="Hook",
        description="Initial attentional capture — does the ad grab the viewer in the first moments?",
        roi_weights={"attention": 0.60, "visual": 0.40},
        brain_regions=["FEF", "intraparietal sulcus", "superior parietal", "V1-V4", "MT/MST"],
        color="#FF6B6B",
    ),
    PillarDef(
        key="emotion",
        label="Emotional Resonance",
        description="Depth of emotional arousal — does the ad make the viewer feel something?",
        roi_weights={"emotion": 1.0},
        brain_regions=["amygdala-adjacent cortex", "insula", "OFC", "anterior cingulate"],
        color="#4ECDC4",
    ),
    PillarDef(
        key="persuasion",
        label="Persuasion",
        description="Message processing and rational buy-in — is the argument landing?",
        roi_weights={"language": 0.70, "attention": 0.30},
        brain_regions=["Broca (44/45)", "Wernicke", "superior temporal sulcus", "dorsal attention"],
        color="#45B7D1",
    ),
    PillarDef(
        key="memory",
        label="Memory Encoding",
        description="Likelihood the ad will be remembered — hippocampal and DMN memory hubs.",
        roi_weights={"dmn": 0.60, "emotion": 0.40},
        brain_regions=["hippocampal cortex", "PCC", "angular gyrus", "mPFC"],
        color="#96CEB4",
    ),
    PillarDef(
        key="sensory",
        label="Sensory Impact",
        description="Raw visual and auditory processing quality — production value signal.",
        roi_weights={"visual": 0.80, "attention": 0.20},
        brain_regions=["V1-V4", "MT/MST", "auditory cortex"],
        color="#FFEAA7",
    ),
    PillarDef(
        key="engagement",
        label="Personal Engagement",
        description="Self-referential processing — does the viewer feel 'this is about me'?",
        roi_weights={"dmn": 0.50, "language": 0.30, "emotion": 0.20},
        brain_regions=["mPFC", "TPJ", "precuneus", "anterior cingulate"],
        color="#DDA0DD",
    ),
]

PILLARS_BY_KEY: Dict[str, PillarDef] = {p.key: p for p in PILLAR_DEFS}


@dataclass
class ROIConfig:
    """Container for all ROI configuration.  Pass this around instead of
    importing module-level dicts so tests can override values."""

    vertex_ranges: Dict[str, List[Tuple[int, int]]] = field(
        default_factory=lambda: ROI_VERTEX_RANGES
    )
    likelihoods: Dict[str, float] = field(
        default_factory=lambda: EMOTION_LIKELIHOODS
    )
    marginals: Dict[str, float] = field(
        default_factory=lambda: EMOTION_MARGINALS
    )
    hcp_parcels: Dict[str, List[str]] = field(
        default_factory=lambda: HCP_PARCEL_GROUPS
    )
    historical_baseline: Dict[str, float] = field(
        default_factory=lambda: HISTORICAL_BASELINE
    )
    historical_baseline_std: Dict[str, float] = field(
        default_factory=lambda: HISTORICAL_BASELINE_STD
    )
