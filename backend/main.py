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

from models.schemas import (
    AudienceSegment,
    CampaignObjective,
    ComparisonResult,
    HealthResponse,
)
from models.merged_schemas import FullAnalysisResult
from services.compare_service import analyze_variants
from services.full_analysis_service import run_full_analysis
from services.tribev2_client import tribev2_health
from storage.uploads import save_upload
from database import DatabaseManager


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


# Initialize database manager
db_manager = DatabaseManager()

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


@app.on_event("startup")
async def startup_event():
    """Initialize database connection on startup"""
    try:
        await db_manager.initialize()
        print("✅ Database connection initialized")
    except Exception as e:
        print(f"⚠️  Database connection failed: {e}")
        print("   API will run without database persistence")


@app.on_event("shutdown")
async def shutdown_event():
    """Close database connection on shutdown"""
    try:
        await db_manager.close()
        print("✅ Database connection closed")
    except Exception as e:
        print(f"⚠️  Error closing database: {e}")

import os as _os

_allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:5501",
    "http://127.0.0.1:5501",
    "null",  # file:// origin
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


@app.get("/tribev2/health")
async def tribev2_health_check() -> dict:
    """Proxy the TribeV2 Modal /health endpoint. Returns 503 if unreachable."""
    from fastapi import HTTPException
    result = await tribev2_health()
    if result is None:
        raise HTTPException(status_code=503, detail="TribeV2 Modal endpoint unreachable or TRIBEV2_URL not set.")
    return result


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
    
    Results are saved to the database for historical tracking.
    """
    variant_inputs: list[tuple[str, str, str | None, bytes]] = []
    for index, upload in enumerate(files):
        raw_bytes = await upload.read()
        await upload.seek(0)
        path = await save_upload(upload)
        label = f"v{index + 1}"
        original = upload.filename or path.name
        variant_inputs.append((label, original, str(path), raw_bytes))

    # Run the analysis
    result = await run_full_analysis(variant_inputs, objective, audience_segment)
    
    # Save results to database (non-blocking - don't fail the API call if DB is down)
    try:
        from database import AnalysisCreate, VariantCreate, VisualScoresCreate, VisualSegmentCreate, BrainAnalysisCreate
        
        # Create analysis record
        analysis_data = AnalysisCreate(
            objective=objective.value,
            audience_segment=audience_segment.value,
            mode=len(files) == 2 and "compare" or "single",
            metadata={"files": [v[1] for v in variant_inputs]}
        )
        
        analysis_id = await db_manager.create_analysis(analysis_data)
        
        # Create variant records
        for i, variant in enumerate(result.variants):
            variant_data = VariantCreate(
                analysis_id=analysis_id,
                variant_label=variant.variant_label,
                original_filename=variant_inputs[i][1],
                file_path=variant_inputs[i][2],
                file_size=len(variant_inputs[i][3])
            )
            variant_id = await db_manager.create_variant(variant_data)
            
            # Save visual scores
            if variant.visual_scores:
                score_data = VisualScoresCreate(
                    variant_id=variant_id,
                    purchase_score=variant.visual_scores.purchase_score,
                    engagement_score=variant.visual_scores.engagement_score,
                    virality_score=variant.visual_scores.virality_score,
                    clarity_score=variant.visual_scores.clarity_score
                )
                await db_manager.create_visual_scores(score_data)
            
            # Save visual segments
            if variant.visual_segments:
                for segment in variant.visual_segments:
                    segment_data = VisualSegmentCreate(
                        variant_id=variant_id,
                        label=segment.segment_type,
                        confidence=segment.confidence_score,
                        visual_weight_pct=getattr(segment, 'visual_weight_pct', None),
                        geometry=segment.bounding_box
                    )
                    await db_manager.create_visual_segments(segment_data)
            
            # Save brain analysis if available
            if variant.brain_analysis:
                brain_data = BrainAnalysisCreate(
                    variant_id=variant_id,
                    composite_score=getattr(variant.brain_analysis, 'composite_score', None),
                    peak_score=getattr(variant.brain_analysis, 'peak_score', None),
                    peak_second=getattr(variant.brain_analysis, 'peak_second', None),
                    sustained_score=getattr(variant.brain_analysis, 'sustained_score', None),
                    dropoff_penalty=getattr(variant.brain_analysis, 'dropoff_penalty', None),
                    dominant_emotion_overall=getattr(variant.brain_analysis, 'dominant_emotion_overall', None)
                )
                await db_manager.create_brain_analysis(brain_data)
        
        print(f"✅ Analysis {analysis_id} saved to database")
        
    except Exception as e:
        # Log error but don't fail the API response
        print(f"⚠️  Failed to save analysis to database: {e}")
        # Add warning to result if not already present
        if not result.warnings:
            result.warnings = []
        result.warnings.append("Analysis completed but could not be saved to database")

    return result


@app.get("/analyses", response_model=list[dict])
async def get_analyses(limit: int = 50, offset: int = 0):
    """Get list of historical analyses"""
    try:
        analyses = await db_manager.get_analyses(limit=limit, offset=offset)
        return analyses
    except Exception as e:
        print(f"⚠️  Failed to fetch analyses: {e}")
        return []


@app.get("/analyses/{analysis_id}", response_model=dict)
async def get_analysis(analysis_id: int):
    """Get detailed analysis by ID"""
    try:
        analysis = await db_manager.get_analysis_by_id(analysis_id)
        if not analysis:
            return {"error": "Analysis not found"}
        return analysis
    except Exception as e:
        print(f"⚠️  Failed to fetch analysis {analysis_id}: {e}")
        return {"error": "Failed to fetch analysis"}


@app.get("/stats")
async def get_stats():
    """Get usage statistics"""
    try:
        stats = await db_manager.get_usage_stats()
        return stats
    except Exception as e:
        print(f"⚠️  Failed to fetch stats: {e}")
        return {"error": "Failed to fetch stats"}


_configure_logfire(app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
