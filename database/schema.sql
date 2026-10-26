-- ArcAnalytics Database Schema
-- PostgreSQL schema for storing ad analysis data and user information
-- Applied by backend/migrate.py. The statements below are safe to run again.

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USER & ORGANIZATION TABLES
-- ============================================================================

-- Organizations/Companies that use the platform
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    plan_type VARCHAR(50) DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'enterprise')),
    settings JSONB DEFAULT '{}'
);

-- Users belonging to organizations
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    preferences JSONB DEFAULT '{}'
);

-- ============================================================================
-- ANALYSIS & CAMPAIGN TABLES
-- ============================================================================

-- Campaigns to group related analyses
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    objective VARCHAR(50) NOT NULL CHECK (objective IN ('purchase', 'engagement', 'virality', 'clarity')),
    audience_segment VARCHAR(100) NOT NULL CHECK (audience_segment IN ('budget_sensitive', 'social_proof_driven', 'viral_share_oriented', 'premium_brand_oriented')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Individual analysis sessions
CREATE TABLE IF NOT EXISTS analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Analysis metadata
    mode VARCHAR(20) NOT NULL CHECK (mode IN ('single', 'compare')),
    objective VARCHAR(50) NOT NULL CHECK (objective IN ('purchase', 'engagement', 'virality', 'clarity')),
    audience_segment VARCHAR(100) NOT NULL CHECK (audience_segment IN ('budget_sensitive', 'social_proof_driven', 'viral_share_oriented', 'premium_brand_oriented')),
    
    -- Results
    explanation TEXT,
    recommendations TEXT[],
    narrative_source VARCHAR(20) DEFAULT 'template' CHECK (narrative_source IN ('template', 'llm')),
    narrative_model VARCHAR(100),
    warnings TEXT[],
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Processing info
    processing_time_seconds INTEGER,
    api_version VARCHAR(20) DEFAULT '1.0',
    status VARCHAR(50) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'cancelled'))
);

-- ============================================================================
-- VARIANT & FILE STORAGE TABLES
-- ============================================================================

-- Individual ad variants (creatives) analyzed
CREATE TABLE IF NOT EXISTS variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
    variant_id VARCHAR(50) NOT NULL, -- e.g., "v1", "v2"
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size_bytes INTEGER,
    file_type VARCHAR(50), -- e.g., "image/jpeg", "video/mp4"
    mime_type VARCHAR(100),
    storage_path VARCHAR(500), -- Path to file in storage (S3, Render Disk, etc.)
    storage_url VARCHAR(1000), -- Public URL if applicable
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Visual analysis scores for each variant
CREATE TABLE IF NOT EXISTS visual_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id UUID REFERENCES variants(id) ON DELETE CASCADE,
    
    -- Main scores (0-100)
    purchase_score DECIMAL(5,2) CHECK (purchase_score >= 0 AND purchase_score <= 100),
    engagement_score DECIMAL(5,2) CHECK (engagement_score >= 0 AND engagement_score <= 100),
    virality_score DECIMAL(5,2) CHECK (virality_score >= 0 AND virality_score <= 100),
    clarity_score DECIMAL(5,2) CHECK (clarity_score >= 0 AND clarity_score <= 100),
    
    -- Neural features (0-100)
    attention_score DECIMAL(5,2) CHECK (attention_score >= 0 AND attention_score <= 100),
    emotional_intensity DECIMAL(5,2) CHECK (emotional_intensity >= 0 AND emotional_intensity <= 100),
    memory_encoding DECIMAL(5,2) CHECK (memory_encoding >= 0 AND memory_encoding <= 100),
    p_convert_peak DECIMAL(5,2) CHECK (p_convert_peak >= 0 AND p_convert_peak <= 100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Detected visual elements/segments
CREATE TABLE IF NOT EXISTS visual_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id UUID REFERENCES variants(id) ON DELETE CASCADE,
    
    label VARCHAR(255) NOT NULL,
    display_label VARCHAR(255),
    pillar VARCHAR(100),
    confidence DECIMAL(5,4) CHECK (confidence >= 0 AND confidence <= 1),
    scoring_weight DECIMAL(5,2),
    impact_score DECIMAL(5,2),
    visual_weight_pct DECIMAL(5,2) CHECK (visual_weight_pct >= 0 AND visual_weight_pct <= 100),
    brain_engagement_score DECIMAL(5,2) CHECK (brain_engagement_score >= 0 AND brain_engagement_score <= 10),
    attention_score DECIMAL(5,2) CHECK (attention_score >= 0 AND attention_score <= 10),
    reasoning TEXT,
    geometry JSONB, -- Bounding boxes, polygons, etc.
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Brain analysis results (from TribeV2)
CREATE TABLE IF NOT EXISTS brain_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id UUID REFERENCES variants(id) ON DELETE CASCADE,
    
    -- Brain scores
    composite_score DECIMAL(5,2) CHECK (composite_score >= 0 AND composite_score <= 100),
    peak_score DECIMAL(5,2),
    peak_second DECIMAL(5,2),
    sustained_score DECIMAL(5,2),
    dropoff_penalty DECIMAL(5,2),
    dominant_emotion_overall VARCHAR(100),
    
    -- ROI means
    roi_emotion DECIMAL(8,6),
    roi_language DECIMAL(8,6),
    roi_attention DECIMAL(8,6),
    roi_visual DECIMAL(8,6),
    roi_dmn DECIMAL(8,6),
    
    -- Timeline data (stored as JSON)
    timeline JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- COMPARISON & ANALYTICS TABLES
-- ============================================================================

-- A/B test comparisons between variants
CREATE TABLE IF NOT EXISTS comparisons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
    
    -- Winner information
    overall_winner_variant_id VARCHAR(50), -- References variant.variant_id
    objective_winner_variant_id VARCHAR(50),
    
    -- Statistical comparison
    p_a_beats_b_composite_score DECIMAL(5,2),
    confidence_level DECIMAL(3,2) DEFAULT 0.95, -- e.g., 0.95 for 95% confidence
    statistical_significance BOOLEAN,
    effect_size DECIMAL(5,2),
    
    -- Comparison summary
    comparison_summary TEXT,
    key_insights TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Industry benchmarks for percentile calculations
CREATE TABLE IF NOT EXISTS industry_benchmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    industry VARCHAR(100) NOT NULL,
    objective VARCHAR(50) NOT NULL,
    audience_segment VARCHAR(100) NOT NULL,
    
    -- Score distributions
    purchase_mean DECIMAL(5,2),
    purchase_std DECIMAL(5,2),
    engagement_mean DECIMAL(5,2),
    engagement_std DECIMAL(5,2),
    virality_mean DECIMAL(5,2),
    virality_std DECIMAL(5,2),
    clarity_mean DECIMAL(5,2),
    clarity_std DECIMAL(5,2),
    composite_mean DECIMAL(5,2),
    composite_std DECIMAL(5,2),
    
    sample_size INTEGER,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(industry, objective, audience_segment)
);

-- ============================================================================
-- USAGE & BILLING TABLES
-- ============================================================================

-- API usage tracking
CREATE TABLE IF NOT EXISTS usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    analysis_id UUID REFERENCES analyses(id) ON DELETE SET NULL,
    
    -- Usage details
    endpoint VARCHAR(100) NOT NULL,
    files_processed INTEGER DEFAULT 0,
    processing_time_ms INTEGER,
    api_cost_cents INTEGER DEFAULT 0,
    
    -- Request metadata
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monthly usage summaries for billing
CREATE TABLE IF NOT EXISTS monthly_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    
    -- Usage metrics
    total_analyses INTEGER DEFAULT 0,
    total_files_processed INTEGER DEFAULT 0,
    total_processing_time_seconds INTEGER DEFAULT 0,
    total_cost_cents INTEGER DEFAULT 0,
    
    -- Plan limits
    plan_limit_analyses INTEGER,
    plan_limit_files INTEGER,
    overage_analyses INTEGER DEFAULT 0,
    overage_files INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organization_id, year, month)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Organization and user indexes
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Analysis indexes
CREATE INDEX IF NOT EXISTS idx_analyses_organization_id ON analyses(organization_id);
CREATE INDEX IF NOT EXISTS idx_analyses_campaign_id ON analyses(campaign_id);
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);
CREATE INDEX IF NOT EXISTS idx_analyses_objective ON analyses(objective);
CREATE INDEX IF NOT EXISTS idx_analyses_mode ON analyses(mode);

-- Variant indexes
CREATE INDEX IF NOT EXISTS idx_variants_analysis_id ON variants(analysis_id);
CREATE INDEX IF NOT EXISTS idx_variants_filename ON variants(filename);

-- Score indexes
CREATE INDEX IF NOT EXISTS idx_visual_scores_variant_id ON visual_scores(variant_id);
CREATE INDEX IF NOT EXISTS idx_visual_segments_variant_id ON visual_segments(variant_id);
CREATE INDEX IF NOT EXISTS idx_brain_analysis_variant_id ON brain_analysis(variant_id);

-- Usage indexes
CREATE INDEX IF NOT EXISTS idx_usage_logs_organization_id ON usage_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_monthly_usage_organization_period ON monthly_usage(organization_id, year, month);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for tables with updated_at.
-- Drop first so applying this file again does not fail.
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_analyses_updated_at ON analyses;
CREATE TRIGGER update_analyses_updated_at BEFORE UPDATE ON analyses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_monthly_usage_updated_at ON monthly_usage;
CREATE TRIGGER update_monthly_usage_updated_at BEFORE UPDATE ON monthly_usage FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Analysis summary view
CREATE OR REPLACE VIEW analysis_summary AS
SELECT 
    a.id,
    a.mode,
    a.objective,
    a.audience_segment,
    a.status,
    a.created_at,
    a.completed_at,
    a.processing_time_seconds,
    o.name as organization_name,
    c.name as campaign_name,
    u.email as user_email,
    COUNT(v.id) as variant_count,
    AVG(vs.purchase_score) as avg_purchase_score,
    AVG(vs.engagement_score) as avg_engagement_score,
    AVG(vs.virality_score) as avg_virality_score,
    AVG(vs.clarity_score) as avg_clarity_score,
    AVG(ba.composite_score) as avg_brain_composite_score
FROM analyses a
LEFT JOIN organizations o ON a.organization_id = o.id
LEFT JOIN campaigns c ON a.campaign_id = c.id
LEFT JOIN users u ON a.user_id = u.id
LEFT JOIN variants v ON a.id = v.analysis_id
LEFT JOIN visual_scores vs ON v.id = vs.variant_id
LEFT JOIN brain_analysis ba ON v.id = ba.variant_id
GROUP BY a.id, o.name, c.name, u.email;

-- Organization usage view
CREATE OR REPLACE VIEW organization_usage AS
SELECT 
    o.id as organization_id,
    o.name,
    COUNT(DISTINCT a.id) as total_analyses,
    COUNT(DISTINCT v.id) as total_variants,
    COUNT(DISTINCT CASE WHEN a.created_at >= date_trunc('month', NOW()) THEN a.id END) as analyses_this_month,
    AVG(a.processing_time_seconds) as avg_processing_time,
    MIN(a.created_at) as first_analysis,
    MAX(a.created_at) as last_analysis
FROM organizations o
LEFT JOIN analyses a ON o.id = a.organization_id
LEFT JOIN variants v ON a.id = v.analysis_id
GROUP BY o.id, o.name;

-- ============================================================================
-- SAMPLE DATA (OPTIONAL - FOR DEVELOPMENT)
-- ============================================================================

-- Insert sample organization (comment out for production)
-- INSERT INTO organizations (name, slug) VALUES 
-- ('Acme Cosmetics', 'acme-cosmetics'),
-- ('Tech Startup Inc', 'tech-startup-inc'),
-- ('Global Retail Corp', 'global-retail-corp');

-- Insert sample industry benchmarks (comment out for production)
-- INSERT INTO industry_benchmarks (industry, objective, audience_segment, purchase_mean, purchase_std, engagement_mean, engagement_std, sample_size) VALUES
-- ('cosmetics', 'purchase', 'premium_brand_oriented', 75.5, 12.3, 82.1, 10.8, 1250),
-- ('technology', 'engagement', 'social_proof_driven', 68.2, 15.6, 79.3, 12.1, 890),
-- ('retail', 'clarity', 'budget_sensitive', 71.8, 11.2, 76.4, 13.5, 2100);

-- ============================================================================
-- RENDER POSTGRESQL COMPATIBILITY NOTES
-- ============================================================================

-- This schema is designed for Render PostgreSQL with the following considerations:
-- 1. Uses UUID primary keys for scalability
-- 2. Includes proper foreign key constraints
-- 3. Has indexes for performance
-- 4. Uses JSONB for flexible metadata storage
-- 5. Includes triggers for timestamp management
-- 6. Has views for common reporting queries
-- 7. Ready for connection pooling with Render
-- 8. Includes usage tracking for potential billing

-- For Render deployment:
-- 1. Set up PostgreSQL database in Render dashboard
-- 2. Add DATABASE_URL to environment variables
-- 3. Use connection pooling for better performance
-- 4. Set up automatic backups in Render
-- 5. Consider Read replicas for analytics queries