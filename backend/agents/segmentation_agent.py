from models.schemas import AdSegment


def mock_segments() -> list[AdSegment]:
    """Return fixed mock segments representing product, headline, and CTA regions."""
    return [
        AdSegment(
            label="product",
            confidence=0.88,
            visual_weight_pct=42.0,
            reasoning="Mock: dominant focal region consistent with product hero placement.",
        ),
        AdSegment(
            label="headline_text",
            confidence=0.76,
            visual_weight_pct=28.0,
            reasoning="Mock: upper-third text band with strong contrast against background.",
        ),
        AdSegment(
            label="cta_button",
            confidence=0.71,
            visual_weight_pct=18.0,
            reasoning="Mock: lower-right button-like shape with high edge density.",
        ),
    ]
