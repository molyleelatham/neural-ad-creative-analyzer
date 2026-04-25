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
from backend.services.compare_service import analyze_variants
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
    files: Annotated[list[UploadFile], File(min_length=2, max_length=5)],
) -> ComparisonResult:
    variant_inputs: list[tuple[str, str]] = []
    for index, upload in enumerate(files):
        path = await save_upload(upload)
        label = f"v{index + 1}"
        original = upload.filename or path.name
        variant_inputs.append((label, original))

    return await analyze_variants(variant_inputs, objective, audience_segment)


_configure_logfire(app)
