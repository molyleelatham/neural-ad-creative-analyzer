"""Bayesian marketing scorer for TribeV2 brain-encoding predictions.

Takes a (T, n_vertices) prediction matrix from TribeV2 and produces:
  - per-timestep dominant emotion + posterior P(Convert)
  - peak / sustained / drop-off scores
  - a composite score for ranking ad variants

Adapted from the reference BayesianMarketingScorer prototype.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List

import numpy as np
import pandas as pd

from app.scoring.roi_config import ROIConfig


@dataclass
class BayesianMarketingScorer:
    baseline_conversion_rate: float = 0.02  # P0(Convert) prior
    weights: Dict[str, float] = field(default_factory=lambda: {
        "peak":      0.40,
        "sustained": 0.40,
        "dropoff":  -0.20,
    })
    config: ROIConfig = field(default_factory=ROIConfig)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _extract_roi_scores(
        self, pred_matrix: np.ndarray
    ) -> Dict[str, np.ndarray]:
        """Mean absolute activation per ROI per timestep.

        Parameters
        ----------
        pred_matrix : ndarray of shape (T, n_vertices)

        Returns
        -------
        dict mapping ROI name → 1-D array of length T
        """
        roi_scores: Dict[str, np.ndarray] = {}
        for roi, ranges in self.config.vertex_ranges.items():
            slices = [
                np.abs(pred_matrix[:, start : end + 1])
                for start, end in ranges
            ]
            # average across all vertex ranges that belong to this ROI
            concat = np.concatenate(slices, axis=1)
            roi_scores[roi] = concat.mean(axis=1)
        return roi_scores

    @staticmethod
    def _dominant_emotion(roi_t: Dict[str, float]) -> str:
        """ROI with highest activation at a single timestep."""
        return max(roi_t, key=roi_t.get)  # type: ignore[arg-type]

    def _bayesian_update(self, prior: float, emotion: str) -> float:
        """P(Convert | Emotion) = P(Emotion|Convert) * P(Convert) / P(Emotion)"""
        likelihood = self.config.likelihoods[emotion]
        marginal = self.config.marginals[emotion]
        posterior = (likelihood * prior) / marginal
        return float(np.clip(posterior, 0.001, 0.999))

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def score_ad(
        self,
        pred_matrix: np.ndarray,
        ad_id: str = "ad_001",
        fps: int = 1,
    ) -> Dict[str, Any]:
        """Score a single ad from its TribeV2 prediction matrix.

        Parameters
        ----------
        pred_matrix : ndarray (T, n_vertices)
            Raw TribeV2 output — one row per TR, one column per vertex.
        ad_id : str
            Human-readable label for this variant.
        fps : int
            Predictions per second (TribeV2 default = 1 Hz).

        Returns
        -------
        dict with keys: ad_id, T_seconds, peak_score, peak_second,
        sustained_score, dropoff_penalty, composite_score,
        dominant_emotion_overall, roi_means, timeline
        """
        T = pred_matrix.shape[0]
        roi_scores = self._extract_roi_scores(pred_matrix)

        posteriors: List[float] = []
        emotions_seq: List[str] = []
        prior = self.baseline_conversion_rate

        for t in range(T):
            roi_t = {roi: float(roi_scores[roi][t]) for roi in roi_scores}
            dominant = self._dominant_emotion(roi_t)
            posterior = self._bayesian_update(prior, dominant)
            posteriors.append(posterior)
            emotions_seq.append(dominant)
            prior = posterior  # sequential update

        posteriors_arr = np.array(posteriors)

        # ── derived scores ────────────────────────────────────────────
        peak_score = float(np.max(posteriors_arr))
        sustained_score = float(np.mean(posteriors_arr))
        peak_idx = int(np.argmax(posteriors_arr))
        post_peak = posteriors_arr[peak_idx:]
        dropoff = (
            float(peak_score - np.mean(post_peak))
            if len(post_peak) > 1
            else 0.0
        )
        composite = (
            self.weights["peak"] * peak_score
            + self.weights["sustained"] * sustained_score
            + self.weights["dropoff"] * dropoff
        )

        # ── per-ROI summary (mean across all timesteps) ──────────────
        roi_means = {roi: float(np.mean(roi_scores[roi])) for roi in roi_scores}

        # ── timestep-level timeline ───────────────────────────────────
        timeline_df = pd.DataFrame({
            "second": np.arange(T) / fps,
            "dominant_emotion": emotions_seq,
            "posterior_P_convert": np.round(posteriors_arr, 6),
            **{f"roi_{k}": np.round(roi_scores[k], 6) for k in roi_scores},
        })

        return {
            "ad_id": ad_id,
            "T_seconds": T,
            "peak_score": round(peak_score, 6),
            "peak_second": round(peak_idx / fps, 2),
            "sustained_score": round(sustained_score, 6),
            "dropoff_penalty": round(dropoff, 6),
            "composite_score": round(composite, 6),
            "dominant_emotion_overall": pd.Series(emotions_seq).mode()[0],
            "roi_means": roi_means,
            "timeline": timeline_df,
        }

    def compare_variants(self, results: List[Dict[str, Any]]) -> pd.DataFrame:
        """Rank scored ad variants by composite score."""
        rows = [
            {
                "ad_id": r["ad_id"],
                "composite_score": r["composite_score"],
                "peak_score": r["peak_score"],
                "peak_second": r["peak_second"],
                "sustained_score": r["sustained_score"],
                "dropoff_penalty": r["dropoff_penalty"],
                "dominant_emotion": r["dominant_emotion_overall"],
            }
            for r in results
        ]
        df = (
            pd.DataFrame(rows)
            .sort_values("composite_score", ascending=False)
            .reset_index(drop=True)
        )
        df.index += 1
        df.index.name = "rank"
        return df

    def baseline_compare(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Compare a single ad's scores against the historical baseline.

        Returns deltas, z-scores, and approximate percentiles for every
        metric so the user can see how the ad stacks up against "average"
        content.
        """
        from scipy.stats import norm  # available in tribev2's numpy stack

        baseline = self.config.historical_baseline
        baseline_std = self.config.historical_baseline_std

        metrics: Dict[str, Any] = {}

        # ── scoring dimensions ────────────────────────────────────────
        for key in ["composite_score", "peak_score", "sustained_score", "dropoff_penalty"]:
            ad_val = result[key]
            bl_val = baseline[key]
            bl_std = baseline_std[key]
            delta = ad_val - bl_val
            z = delta / bl_std if bl_std > 0 else 0.0
            pct = float(norm.cdf(z)) * 100  # percentile
            metrics[key] = {
                "ad_value":   round(ad_val, 6),
                "baseline":   round(bl_val, 6),
                "delta":      round(delta, 6),
                "z_score":    round(z, 4),
                "percentile": round(pct, 1),
            }

        # ── ROI activations ───────────────────────────────────────────
        roi_metrics: Dict[str, Any] = {}
        for roi in self.config.vertex_ranges:
            roi_key = f"roi_{roi}"
            ad_val = result["roi_means"][roi]
            bl_val = baseline[roi_key]
            bl_std = baseline_std[roi_key]
            delta = ad_val - bl_val
            z = delta / bl_std if bl_std > 0 else 0.0
            pct = float(norm.cdf(z)) * 100
            roi_metrics[roi] = {
                "ad_value":   round(ad_val, 6),
                "baseline":   round(bl_val, 6),
                "delta":      round(delta, 6),
                "z_score":    round(z, 4),
                "percentile": round(pct, 1),
            }

        # ── overall verdict ───────────────────────────────────────────
        comp_pct = metrics["composite_score"]["percentile"]
        if comp_pct >= 75:
            verdict = "above_average"
        elif comp_pct >= 40:
            verdict = "average"
        else:
            verdict = "below_average"

        return {
            "ad_id":       result["ad_id"],
            "verdict":     verdict,
            "percentile":  comp_pct,
            "score_vs_baseline": metrics,
            "roi_vs_baseline":   roi_metrics,
        }

    def ab_probability(
        self, result_a: Dict[str, Any], result_b: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Bayesian A/B comparison: P(A > B) per dimension.

        Uses the per-timestep posterior sequences as empirical distributions
        and estimates the probability that ad A outperforms ad B on each
        scoring dimension.
        """
        tl_a = result_a["timeline"]["posterior_P_convert"].values
        tl_b = result_b["timeline"]["posterior_P_convert"].values

        # bootstrap-style: for every pair of timesteps, how often is A > B?
        min_len = min(len(tl_a), len(tl_b))
        a_wins = float(np.mean(tl_a[:min_len] > tl_b[:min_len]))

        # per-dimension comparison
        dims = {}
        for dim in ["peak_score", "sustained_score", "composite_score"]:
            dims[f"P_A_beats_B_{dim}"] = (
                1.0 if result_a[dim] > result_b[dim] else 0.0
            )

        # roi-level
        roi_comparison = {}
        for roi in result_a["roi_means"]:
            a_val = result_a["roi_means"][roi]
            b_val = result_b["roi_means"][roi]
            roi_comparison[roi] = {
                "ad_a": round(a_val, 6),
                "ad_b": round(b_val, 6),
                "delta": round(a_val - b_val, 6),
                "a_stronger": a_val > b_val,
            }

        winner = result_a["ad_id"] if a_wins >= 0.5 else result_b["ad_id"]

        return {
            "ad_a": result_a["ad_id"],
            "ad_b": result_b["ad_id"],
            "P_A_wins_overall": round(a_wins, 4),
            **dims,
            "roi_comparison": roi_comparison,
            "winner": winner,
            "confidence": round(abs(a_wins - 0.5) * 2, 4),  # 0 = coin flip, 1 = certain
        }
