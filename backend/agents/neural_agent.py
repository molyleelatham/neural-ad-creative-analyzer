import hashlib

from models.schemas import NeuralFeatures


def _byte_to_unit_interval(b: int) -> float:
    return b / 255.0


def mock_neural_features(filename: str) -> NeuralFeatures:
    """Deterministic mock neural features derived from the filename."""
    digest = hashlib.sha256(filename.encode("utf-8")).digest()
    chunks = [digest[i : i + 5] for i in range(0, min(len(digest), 25), 5)]
    while len(chunks) < 5:
        chunks.append(digest)

    attention = 40 + 60 * _byte_to_unit_interval(chunks[0][0])
    emotional = 35 + 65 * _byte_to_unit_interval(chunks[1][1])
    memory = 30 + 70 * _byte_to_unit_interval(chunks[2][2])
    friction = 10 + 90 * _byte_to_unit_interval(chunks[3][3])
    ms_base = int.from_bytes(chunks[4][:2], "big") % 4000
    predicted_ms = float(400 + ms_base)

    return NeuralFeatures(
        attention_score=round(attention, 2),
        emotional_intensity=round(emotional, 2),
        memory_signal=round(memory, 2),
        friction_score=round(friction, 2),
        predicted_attention_ms=round(predicted_ms, 2),
    )
