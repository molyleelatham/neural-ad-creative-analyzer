from pathlib import Path
from typing import Annotated

from dotenv import load_dotenv

# Load `.env` before any backend imports that read the environment at import time.
_backend_dir = Path(__file__).resolve().parent
_repo_root = _backend_dir.parent
load_dotenv(_repo_root / ".env")
load_dotenv(_backend_dir / ".env", override=True)

from fastapi import FastAPI, File, Form, UploadFile
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from fastapi.middleware.cors import CORSMiddleware

from backend.models.schemas import (
    AudienceSegment,
    CampaignObjective,
    ComparisonResult,
    HealthResponse,
)
from backend.models.merged_schemas import FullAnalysisResult
from backend.services.compare_service import analyze_variants
from backend.services.full_analysis_service import run_full_analysis
from backend.storage.uploads import save_upload


class _AppEnv(BaseSettings):
    """Minimal environment binding (pydantic-settings reads from the process env)."""

    model_config = SettingsConfigDict(extra="ignore")
    LOGFIRE_TOKEN: str | None = Field(default=None)


def _configure_logfire(application: FastAPI) -> None:
    token = _AppEnv().LOGFIRE_TOKEN
    if not token:
        return
    try:
        import logfire

        logfire.configure(token=token)
        logfire.instrument_fastapi(application)
        instrument_ai = getattr(logfire, "instrument_pydantic_ai", None)
        if callable(instrument_ai):
            instrument_ai()
    except Exception:
        # Observability is optional; never block API startup.
        return


app = FastAPI(
    title="Arcanalytics API",
    description=(
        "AI ad analytics — compare ad variants (mock scoring pipeline). "
        "Optional Pydantic AI narrative: set OPENAI_API_KEY and/or GOOGLE_API_KEY (Gemini); "
        "override with PYDANTIC_AI_MODEL (e.g. google-gla:gemini-2.0-flash). "
        "LOGFIRE_TOKEN instruments FastAPI and Pydantic AI in Logfire."
    ),
    version="0.1.0",
)

import os as _os

_allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
# Allow additional origins via env var (comma-separated), e.g. your Vercel URL
_extra = (_os.environ.get("CORS_ORIGINS") or "").strip()
if _extra:
    _allowed_origins.extend([o.strip() for o in _extra.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root() -> dict[str, str]:
    return {"service": "arcanalytics", "docs": "/docs", "health": "/health"}


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", service="arcanalytics-backend")


@app.post("/compare", response_model=ComparisonResult)
async def compare(
    objective: Annotated[CampaignObjective, Form()],
    audience_segment: Annotated[AudienceSegment, Form()],
    files: Annotated[list[UploadFile], File(min_length=1, max_length=5)],
) -> ComparisonResult:
    variant_inputs: list[tuple[str, str, str | None]] = []
    for index, upload in enumerate(files):
        path = await save_upload(upload)
        label = f"v{index + 1}"
        original = upload.filename or path.name
        variant_inputs.append((label, original, str(path)))

    return await analyze_variants(variant_inputs, objective, audience_segment)


@app.post("/analyze-full", response_model=FullAnalysisResult)
async def analyze_full(
    objective: Annotated[CampaignObjective, Form()],
    audience_segment: Annotated[AudienceSegment, Form()],
    files: Annotated[list[UploadFile], File(min_length=1, max_length=2)],
) -> FullAnalysisResult:
    """
    Unified endpoint: runs SAM3 visual analysis + TribeV2 brain scoring in parallel.

    Accepts 1 file (single-ad mode) or 2 files (A/B compare mode).
    TribeV2 brain scoring requires TRIBEV2_URL to be set in the environment.
    If TribeV2 is unreachable the response still contains full visual analysis
    plus a warning string in the `warnings` field.
    """
    variant_inputs: list[tuple[str, str, str | None, bytes]] = []
    for index, upload in enumerate(files):
        raw_bytes = await upload.read()
        await upload.seek(0)
        path = await save_upload(upload)
        label = f"v{index + 1}"
        original = upload.filename or path.name
        variant_inputs.append((label, original, str(path), raw_bytes))

    return await run_full_analysis(variant_inputs, objective, audience_segment)


_configure_logfire(app)
