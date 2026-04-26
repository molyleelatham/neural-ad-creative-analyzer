from models.schemas import NeuralFeatures, VariantScore


def scores_from_neural(features: NeuralFeatures) -> VariantScore:
    """
    Derive campaign-relevant scores from neural mock signals.
    Higher friction lowers purchase/clarity; attention and memory lift engagement.
    """
    attn = features.attention_score / 100.0
    emo = features.emotional_intensity / 100.0
    mem = features.memory_signal / 100.0
    fric = features.friction_score / 100.0
    dwell = min(features.predicted_attention_ms / 5000.0, 1.0)

    purchase = 100.0 * (0.35 * attn + 0.25 * mem + 0.2 * (1 - fric) + 0.2 * emo)
    engagement = 100.0 * (0.3 * dwell + 0.35 * emo + 0.2 * attn + 0.15 * mem)
    virality = 100.0 * (0.45 * emo + 0.3 * attn + 0.25 * mem)
    clarity = 100.0 * (0.5 * (1 - fric) + 0.3 * attn + 0.2 * mem)

    def clamp(x: float) -> float:
        return round(max(0.0, min(100.0, x)), 2)

    return VariantScore(
        purchase=clamp(purchase),
        engagement=clamp(engagement),
        virality=clamp(virality),
        clarity=clamp(clarity),
    )
