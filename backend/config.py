from __future__ import annotations

import os


def _env_bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    v = raw.strip().lower()
    if v in {"1", "true", "yes", "y", "on"}:
        return True
    if v in {"0", "false", "no", "n", "off"}:
        return False
    return default


USE_ROBOFLOW: bool = _env_bool("USE_ROBOFLOW", False)
USE_LLM: bool = _env_bool("USE_LLM", False)
USE_MOCKS: bool = _env_bool("USE_MOCKS", True)

