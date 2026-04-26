"""
Database module for ArcAnalytics
Integrates with FastAPI backend for PostgreSQL operations on Render
"""

import os
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

import asyncpg
from pydantic import BaseModel, Field


# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================

class DatabaseConfig:
    """Database configuration for Render PostgreSQL"""
    
    def __init__(self):
        self.database_url = os.getenv("DATABASE_URL")
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable is required")
        
        # Use the database URL as-is for asyncpg
        # Render provides: postgresql://user:password@host:port/database
        self.asyncpg_url = self.database_url

    @property
    def connection_params(self) -> Dict[str, Any]:
        """Connection parameters for asyncpg"""
        return {
            "command_timeout": 60,
            "server_settings": {
                "application_name": "arcanalytics_api",
                "timezone": "UTC"
            }
        }


# ============================================================================
# PYDANTIC MODELS FOR DATABASE ENTITIES
# ============================================================================

class OrganizationBase(BaseModel):
    name: str = Field(..., max_length=255)
    slug: str = Field(..., max_length=100)
    plan_type: str = Field(default="free", pattern="^(free|pro|enterprise)$")

class OrganizationCreate(OrganizationBase):
    pass

class Organization(OrganizationBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    is_active: bool = True
    settings: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    email: str = Field(..., max_length=255)
    name: Optional[str] = None
    role: str = Field(default="member", pattern="^(owner|admin|member)$")

class UserCreate(UserBase):
    organization_id: uuid.UUID

class User(UserBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None
    is_active: bool = True
    preferences: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        from_attributes = True

class CampaignBase(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    objective: str = Field(..., pattern="^(purchase|engagement|virality|clarity)$")
    audience_segment: str = Field(..., pattern="^(budget_sensitive|social_proof_driven|viral_share_oriented|premium_brand_oriented)$")
    status: str = Field(default="active", pattern="^(draft|active|paused|completed)$")

class CampaignCreate(CampaignBase):
    organization_id: uuid.UUID

class Campaign(CampaignBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        from_attributes = True

class AnalysisBase(BaseModel):
    mode: str = Field(..., pattern="^(single|compare)$")
    objective: str = Field(..., pattern="^(purchase|engagement|virality|clarity)$")
    audience_segment: str = Field(..., pattern="^(budget_sensitive|social_proof_driven|viral_share_oriented|premium_brand_oriented)$")

class AnalysisCreate(AnalysisBase):
    campaign_id: Optional[uuid.UUID] = None
    organization_id: uuid.UUID
    user_id: Optional[uuid.UUID] = None

class Analysis(AnalysisBase):
    id: uuid.UUID
    campaign_id: Optional[uuid.UUID]
    organization_id: uuid.UUID
    user_id: Optional[uuid.UUID]
    explanation: Optional[str] = None
    recommendations: List[str] = Field(default_factory=list)
    narrative_source: str = "template"
    narrative_model: Optional[str] = None
    warnings: List[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    processing_time_seconds: Optional[int] = None
    api_version: str = "1.0"
    status: str = "processing"

    class Config:
        from_attributes = True

class VariantBase(BaseModel):
    variant_id: str = Field(..., max_length=50)
    filename: str = Field(..., max_length=255)
    original_filename: str = Field(..., max_length=255)

class VariantCreate(VariantBase):
    analysis_id: uuid.UUID
    file_size_bytes: Optional[int] = None
    file_type: Optional[str] = None
    mime_type: Optional[str] = None
    storage_path: Optional[str] = None
    storage_url: Optional[str] = None

class Variant(VariantBase):
    id: uuid.UUID
    analysis_id: uuid.UUID
    file_size_bytes: Optional[int] = None
    file_type: Optional[str] = None
    mime_type: Optional[str] = None
    storage_path: Optional[str] = None
    storage_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class VisualScoresBase(BaseModel):
    purchase_score: Optional[float] = Field(None, ge=0, le=100)
    engagement_score: Optional[float] = Field(None, ge=0, le=100)
    virality_score: Optional[float] = Field(None, ge=0, le=100)
    clarity_score: Optional[float] = Field(None, ge=0, le=100)
    attention_score: Optional[float] = Field(None, ge=0, le=100)
    emotional_intensity: Optional[float] = Field(None, ge=0, le=100)
    memory_encoding: Optional[float] = Field(None, ge=0, le=100)
    p_convert_peak: Optional[float] = Field(None, ge=0, le=100)

class VisualScoresCreate(VisualScoresBase):
    variant_id: uuid.UUID

class VisualScores(VisualScoresBase):
    id: uuid.UUID
    variant_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True

class VisualSegmentBase(BaseModel):
    label: str = Field(..., max_length=255)  # Changed from segment_type to label
    confidence: Optional[float] = Field(None, ge=0, le=1)  # Changed from confidence_score
    visual_weight_pct: Optional[float] = Field(None, ge=0, le=100)
    geometry: Optional[Dict[str, Any]] = None  # Changed from bounding_box

class VisualSegmentCreate(VisualSegmentBase):
    variant_id: uuid.UUID

class VisualSegment(VisualSegmentBase):
    id: uuid.UUID
    variant_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True

class BrainAnalysisBase(BaseModel):
    composite_score: Optional[float] = Field(None, ge=0, le=100)
    peak_score: Optional[float] = Field(None, ge=0, le=100)
    peak_second: Optional[float] = Field(None, ge=0)
    sustained_score: Optional[float] = Field(None, ge=0, le=100)
    dropoff_penalty: Optional[float] = Field(None, ge=0)
    dominant_emotion_overall: Optional[str] = None
    roi_emotion: Optional[float] = None
    roi_language: Optional[float] = None
    roi_attention: Optional[float] = None
    roi_visual: Optional[float] = None
    roi_dmn: Optional[float] = None

class BrainAnalysisCreate(BrainAnalysisBase):
    variant_id: uuid.UUID

class BrainAnalysis(BrainAnalysisBase):
    id: uuid.UUID
    variant_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True

# ============================================================================
# DATABASE MANAGER
# ============================================================================

class DatabaseManager:
    """Async PostgreSQL database manager for ArcAnalytics"""
    
    def __init__(self, config: Optional[DatabaseConfig] = None):
        self.config = config or DatabaseConfig()
        self._pool: Optional[asyncpg.Pool] = None
    
    async def initialize(self):
        """Initialize database connection pool"""
        if not self._pool:
            self._pool = await asyncpg.create_pool(
                self.config.asyncpg_url,
                **self.config.connection_params
            )
    
    async def close(self):
        """Close database connection pool"""
        if self._pool:
            await self._pool.close()
            self._pool = None
    
    @asynccontextmanager
    async def get_connection(self):
        """Get database connection from pool"""
        if not self._pool:
            await self.initialize()
        
        async with self._pool.acquire() as connection:
            yield connection
    
    # ============================================================================
    # ORGANIZATION OPERATIONS
    # ============================================================================
    
    async def create_organization(self, org_data: OrganizationCreate) -> Organization:
        """Create a new organization"""
        async with self.get_connection() as conn:
            record = await conn.fetchrow("""
                INSERT INTO organizations (name, slug, plan_type)
                VALUES ($1, $2, $3)
                RETURNING *
            """, org_data.name, org_data.slug, org_data.plan_type)
            
            return Organization(**record)
    
    async def get_organization(self, org_id: uuid.UUID) -> Optional[Organization]:
        """Get organization by ID"""
        async with self.get_connection() as conn:
            record = await conn.fetchrow("""
                SELECT * FROM organizations WHERE id = $1
            """, org_id)
            
            return Organization(**record) if record else None
    
    async def get_organization_by_slug(self, slug: str) -> Optional[Organization]:
        """Get organization by slug"""
        async with self.get_connection() as conn:
            record = await conn.fetchrow("""
                SELECT * FROM organizations WHERE slug = $1
            """, slug)
            
            return Organization(**record) if record else None
    
    # ============================================================================
    # USER OPERATIONS
    # ============================================================================
    
    async def create_user(self, user_data: UserCreate) -> User:
        """Create a new user"""
        async with self.get_connection() as conn:
            record = await conn.fetchrow("""
                INSERT INTO users (email, name, organization_id, role)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            """, user_data.email, user_data.name, user_data.organization_id, user_data.role)
            
            return User(**record)
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        async with self.get_connection() as conn:
            record = await conn.fetchrow("""
                SELECT * FROM users WHERE email = $1
            """, email)
            
            return User(**record) if record else None
    
    # ============================================================================
    # CAMPAIGN OPERATIONS
    # ============================================================================
    
    async def create_campaign(self, campaign_data: CampaignCreate) -> Campaign:
        """Create a new campaign"""
        async with self.get_connection() as conn:
            record = await conn.fetchrow("""
                INSERT INTO campaigns (organization_id, name, description, objective, audience_segment, status)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            """, campaign_data.organization_id, campaign_data.name, campaign_data.description,
                  campaign_data.objective, campaign_data.audience_segment, campaign_data.status)
            
            return Campaign(**record)
    
    async def get_organization_campaigns(self, org_id: uuid.UUID) -> List[Campaign]:
        """Get all campaigns for an organization"""
        async with self.get_connection() as conn:
            records = await conn.fetch("""
                SELECT * FROM campaigns 
                WHERE organization_id = $1 
                ORDER BY created_at DESC
            """, org_id)
            
            return [Campaign(**record) for record in records]
    
    # ============================================================================
    # ANALYSIS OPERATIONS
    # ============================================================================
    
    async def create_analysis(self, analysis_data: AnalysisCreate) -> Analysis:
        """Create a new analysis"""
        async with self.get_connection() as conn:
            record = await conn.fetchrow("""
                INSERT INTO analyses (campaign_id, organization_id, user_id, mode, objective, audience_segment)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            """, analysis_data.campaign_id, analysis_data.organization_id, analysis_data.user_id,
                  analysis_data.mode, analysis_data.objective, analysis_data.audience_segment)
            
            return Analysis(**record)
    
    async def update_analysis_results(self, analysis_id: uuid.UUID, results: Dict[str, Any]) -> Analysis:
        """Update analysis with results"""
        async with self.get_connection() as conn:
            record = await conn.fetchrow("""
                UPDATE analyses 
                SET explanation = $2, 
                    recommendations = $3, 
                    narrative_source = $4,
                    narrative_model = $5,
                    warnings = $6,
                    completed_at = NOW(),
                    processing_time_seconds = $7,
                    status = 'completed'
                WHERE id = $1
                RETURNING *
            """, analysis_id, 
                  results.get('explanation'),
                  results.get('recommendations', []),
                  results.get('narrative_source', 'template'),
                  results.get('narrative_model'),
                  results.get('warnings', []),
                  results.get('processing_time_seconds'))
            
            return Analysis(**record)
    
    async def get_analysis(self, analysis_id: uuid.UUID) -> Optional[Analysis]:
        """Get analysis by ID"""
        async with self.get_connection() as conn:
            record = await conn.fetchrow("""
                SELECT * FROM analyses WHERE id = $1
            """, analysis_id)
            
            return Analysis(**record) if record else None
    
    async def get_organization_analyses(self, org_id: uuid.UUID, limit: int = 50) -> List[Analysis]:
        """Get recent analyses for an organization"""
        async with self.get_connection() as conn:
            records = await conn.fetch("""
                SELECT * FROM analyses 
                WHERE organization_id = $1 
                ORDER BY created_at DESC
                LIMIT $2
            """, org_id, limit)
            
            return [Analysis(**record) for record in records]
    
    # ============================================================================
    # VARIANT OPERATIONS
    # ============================================================================
    
    async def create_variant(self, variant_data: VariantCreate) -> Variant:
        """Create a new variant"""
        async with self.get_connection() as conn:
            record = await conn.fetchrow("""
                INSERT INTO variants (analysis_id, variant_id, filename, original_filename, 
                                    file_size_bytes, file_type, mime_type, storage_path, storage_url)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            """, variant_data.analysis_id, variant_data.variant_id, variant_data.filename,
                  variant_data.original_filename, variant_data.file_size_bytes, variant_data.file_type,
                  variant_data.mime_type, variant_data.storage_path, variant_data.storage_url)
            
            return Variant(**record)
    
    async def get_analysis_variants(self, analysis_id: uuid.UUID) -> List[Variant]:
        """Get all variants for an analysis"""
        async with self.get_connection() as conn:
            records = await conn.fetch("""
                SELECT * FROM variants 
                WHERE analysis_id = $1 
                ORDER BY variant_id
            """, analysis_id)
            
            return [Variant(**record) for record in records]
    
    # ============================================================================
    # VISUAL SCORES OPERATIONS
    # ============================================================================
    
    async def create_visual_scores(self, scores_data: VisualScoresCreate) -> VisualScores:
        """Create visual scores for a variant"""
        async with self.get_connection() as conn:
            record = await conn.fetchrow("""
                INSERT INTO visual_scores (variant_id, purchase_score, engagement_score, virality_score, 
                                         clarity_score, attention_score, emotional_intensity, 
                                         memory_encoding, p_convert_peak)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            """, scores_data.variant_id, scores_data.purchase_score, scores_data.engagement_score,
                  scores_data.virality_score, scores_data.clarity_score, scores_data.attention_score,
                  scores_data.emotional_intensity, scores_data.memory_encoding, scores_data.p_convert_peak)
            
            return VisualScores(**record)
    
    async def create_visual_segments(self, segment_data: VisualSegmentCreate) -> VisualSegment:
        """Create visual segments for a variant"""
        async with self.get_connection() as conn:
            record = await conn.fetchrow("""
                INSERT INTO visual_segments (variant_id, label, confidence, visual_weight_pct, geometry)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            """, segment_data.variant_id, segment_data.segment_type, segment_data.confidence_score,
                  segment_data.visual_weight_pct, segment_data.bounding_box)
            
            return VisualSegment(**record)
    
    async def create_brain_analysis(self, brain_data: BrainAnalysisCreate) -> BrainAnalysis:
        """Create brain analysis for a variant"""
        async with self.get_connection() as conn:
            record = await conn.fetchrow("""
                INSERT INTO brain_analysis (variant_id, composite_score, peak_score, peak_second, 
                                          sustained_score, dropoff_penalty, dominant_emotion_overall,
                                          roi_emotion, roi_language, roi_attention, roi_visual, roi_dmn)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING *
            """, brain_data.variant_id, brain_data.composite_score, brain_data.peak_score,
                  brain_data.peak_second, brain_data.sustained_score, brain_data.dropoff_penalty,
                  brain_data.dominant_emotion_overall, brain_data.roi_emotion, brain_data.roi_language,
                  brain_data.roi_attention, brain_data.roi_visual, brain_data.roi_dmn)
            
            return BrainAnalysis(**record)
    
    # ============================================================================
    # ANALYTICS & REPORTING
    # ============================================================================
    
    async def get_organization_stats(self, org_id: uuid.UUID) -> Dict[str, Any]:
        """Get organization usage statistics"""
        async with self.get_connection() as conn:
            stats = await conn.fetchrow("""
                SELECT 
                    COUNT(DISTINCT a.id) as total_analyses,
                    COUNT(DISTINCT v.id) as total_variants,
                    COUNT(DISTINCT CASE WHEN a.created_at >= date_trunc('month', NOW()) THEN a.id END) as analyses_this_month,
                    AVG(a.processing_time_seconds) as avg_processing_time,
                    MIN(a.created_at) as first_analysis,
                    MAX(a.created_at) as last_analysis
                FROM organizations o
                LEFT JOIN analyses a ON o.id = a.organization_id
                LEFT JOIN variants v ON a.id = v.analysis_id
                WHERE o.id = $1
            """, org_id)
            
            return dict(stats) if stats else {}
    
    async def log_usage(self, org_id: uuid.UUID, user_id: Optional[uuid.UUID], 
                       analysis_id: Optional[uuid.UUID], endpoint: str, 
                       files_processed: int = 0, processing_time_ms: int = 0):
        """Log API usage for analytics and billing"""
        async with self.get_connection() as conn:
            await conn.execute("""
                INSERT INTO usage_logs (organization_id, user_id, analysis_id, endpoint, 
                                       files_processed, processing_time_ms)
                VALUES ($1, $2, $3, $4, $5, $6)
            """, org_id, user_id, analysis_id, endpoint, files_processed, processing_time_ms)


# ============================================================================
# GLOBAL DATABASE INSTANCE
# ============================================================================

# Global database manager instance
db_manager = DatabaseManager()

# FastAPI dependency functions
async def get_db() -> DatabaseManager:
    """FastAPI dependency for database manager"""
    return db_manager

async def init_database():
    """Initialize database connection pool"""
    await db_manager.initialize()

async def close_database():
    """Close database connection pool"""
    await db_manager.close()