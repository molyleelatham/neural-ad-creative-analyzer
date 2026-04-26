from models.schemas import AdSegment


def mock_segments() -> list[AdSegment]:
    """Return fixed mock segments representing product, headline, and CTA regions with proper pillar assignments."""
    return [
        AdSegment(
            label="product_shot",
            confidence=0.88,
            visual_weight_pct=42.0,
            pillar="clarity",
            segment_type="product",
            reasoning="Mock: dominant focal region consistent with product hero placement.",
        ),
        AdSegment(
            label="headline_text",
            confidence=0.76,
            visual_weight_pct=28.0,
            pillar="attention",
            segment_type="headline",
            reasoning="Mock: upper-third text band with strong contrast against background.",
        ),
        AdSegment(
            label="cta_button",
            confidence=0.71,
            visual_weight_pct=18.0,
            pillar="urgency",
            segment_type="cta",
            reasoning="Mock: lower-right button-like shape with high edge density.",
        ),
        AdSegment(
            label="brand_logo",
            confidence=0.65,
            visual_weight_pct=12.0,
            pillar="trust",
            segment_type="brand",
            reasoning="Mock: brand identifier in upper corner for trust building.",
        ),
    ]
