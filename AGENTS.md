# ArcAnalytics Agent Context

## Project Overview

**ArcAnalytics** is an AI-powered ad analytics platform that transforms complex multi-model analysis into clear, actionable creative intelligence for marketers. The platform combines computer vision, neuroscience-based analysis, causal attribution, predictive modeling, and statistical analysis to help optimize ad creatives through A/B testing and timeline-based insights.

### Core Value Propositions
- **Causal Clarity**: See exactly which creative elements drive performance
- **Predictive Power**: Know how creatives will perform before launch
- **Unified Intelligence**: Single Arc Score for quick assessment
- **A/B Testing Excellence**: Statistical rigor in ad performance testing
- **Timeline Intelligence**: Bayesian conversion probability throughout video duration
- **LLM-Powered Analysis**: Natural language insights and recommendations

### Target Users
- Marketing Managers, Creative Directors, Performance Marketers
- Brand Strategists, A/B Testers, Content Creators

## Technology Stack

### Backend (Python/FastAPI)
- **Framework**: FastAPI 0.115.6 with Uvicorn server
- **Database**: PostgreSQL via Supabase (asyncpg driver)
- **AI/ML**: 
  - PyMC (Bayesian analysis)
  - SciPy/NumPy (statistical analysis)
  - StatsModels (advanced statistics)
  - ArviZ (Bayesian visualization)
  - OpenCV (computer vision)
- **LLM Integration**: Pydantic AI with OpenAI and Google Gemini support
- **External Services**: Roboflow (SAM3 visual analysis), TribeV2 (neuroscience scoring)

### Frontend (Next.js)
- **Framework**: Next.js 16.2.4 (React 19.2.4)
- **Styling**: Tailwind CSS 4
- **Database Client**: Supabase JS
- **Language**: TypeScript

## Project Structure

```
arcanalytics-merge-test/
├── backend/
│   ├── main.py                 # FastAPI application & endpoints
│   ├── database.py             # Database operations & models
│   ├── requirements.txt        # Python dependencies
│   ├── agents/                 # AI agent implementations
│   │   ├── sam3_agent.py      # Roboflow SAM3 integration
│   │   ├── tribev2_client.py  # Neuroscience scoring
│   │   ├── causal_agent.py    # Causal attribution
│   │   └── predictive_agent.py # Predictive modeling
│   ├── services/               # Business logic services
│   │   ├── ab_test_service.py      # A/B testing management
│   │   ├── statistical_analysis.py # Frequentist statistics
│   │   ├── bayesian_analysis.py    # Bayesian inference
│   │   ├── power_analysis.py       # Sample size calculation
│   │   ├── timeline_analysis.py    # Timeline event detection
│   │   ├── bayesian_timeline.py    # Bayesian timeline inference
│   │   ├── unified_scoring.py      # Unified scoring engine
│   │   └── full_analysis_service.py # Orchestration service
│   ├── models/                 # Pydantic schemas
│   │   ├── schemas.py         # Core data models
│   │   └── merged_schemas.py  # Combined analysis models
│   └── storage/               # File handling
│       └── uploads.py         # Upload management
├── frontend/
│   ├── package.json           # Node dependencies
│   ├── .env.local             # Frontend environment variables
│   ├── lib/
│   │   └── supabase.ts        # Supabase client configuration
│   └── AGENTS.md              # Next.js specific agent rules
├── database/
│   └── schema.sql             # PostgreSQL schema definition
├── DESIGN_PRD.md              # Product requirements document
├── .env                       # Environment variables (gitignored)
└── .env.example              # Environment variable template
```

## Database Schema

### Core Tables
- **organizations**: Companies using the platform
- **users**: User accounts with organization associations
- **campaigns**: Groups related analyses
- **analyses**: Individual analysis sessions (single/compare modes)
- **variants**: Individual ad creatives analyzed
- **visual_scores**: SAM3 visual analysis scores (purchase, engagement, virality, clarity)
- **visual_segments**: Detected visual elements with bounding boxes
- **brain_analysis**: TribeV2 neuroscience scoring results

### A/B Testing Infrastructure
- **ab_test_campaigns**: Multi-variant experiment management
- **ab_test_results**: Real-time metrics tracking per variant
- **statistical_tests**: Statistical test results (t-tests, chi-square, ANOVA, Bayesian)
- **sample_size_tracking**: Power analysis and sample size monitoring

### Bayesian Timeline Analysis
- **timeline_events**: Key moments (peaks, valleys, inflection points)
- **timeline_segments**: Timeline segmentation (hook, body, CTA, dropoff)
- **temporal_correlations**: Element-to-engagement temporal relationships
- **bayesian_posteriors**: Bayesian posterior distributions for timeline metrics

## API Endpoints

### Core Analysis
- `POST /compare` - Compare ad variants (legacy endpoint)
- `POST /analyze-full` - Unified analysis endpoint (SAM3 + TribeV2)
- `GET /analyses` - List historical analyses
- `GET /analyses/{analysis_id}` - Get detailed analysis
- `GET /stats` - Usage statistics

### A/B Testing
- `POST /ab-test/campaigns` - Create A/B test campaign
- `GET /ab-test/campaigns/{campaign_id}` - Get campaign details
- `POST /ab-test/campaigns/{campaign_id}/start` - Start campaign
- `POST /ab-test/campaigns/{campaign_id}/stop` - Stop campaign
- `POST /ab-test/campaigns/{campaign_id}/metrics` - Record metrics
- `GET /ab-test/campaigns/{campaign_id}/analyze` - Statistical analysis
- `GET /ab-test/campaigns/{campaign_id}/dashboard` - Dashboard data

### Timeline Analysis
- `POST /timeline/analyze` - Analyze timeline events
- `POST /timeline/bayesian` - Bayesian timeline inference
- `POST /timeline/compare-segments` - Compare timeline segments
- `POST /timeline/element-impact` - Element impact analysis

### Health & Monitoring
- `GET /health` - API health check
- `GET /tribev2/health` - TribeV2 service health
- `GET /roboflow/health` - Roboflow service health

## Environment Configuration

### Required Environment Variables
```bash
# Database
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# External Services
ROBOFLOW_API_KEY=...
ROBOFLOW_WORKSPACE=arcanalytics
ROBOFLOW_WORKFLOW_ID=sam3
TRIBEV2_URL=https://...

# AI Models
GOOGLE_API_KEY=...
OPENAI_API_KEY=...

# Observability
LOGFIRE_TOKEN=...

# CORS
CORS_ORIGINS=http://localhost:3000,https://your-frontend-url.vercel.app
```

## Development Workflow

### Backend Development
1. **Start server**: `cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000`
2. **Install dependencies**: `pip install -r requirements.txt`
3. **Database migrations**: Apply schema.sql to Supabase PostgreSQL
4. **Testing**: Use `/docs` endpoint for interactive API testing

### Frontend Development
1. **Start dev server**: `cd frontend && npm run dev`
2. **Install dependencies**: `npm install`
3. **Build**: `npm run build`
4. **Production**: `npm start`

### Key Development Notes
- Backend uses async/await patterns throughout
- Database operations use asyncpg for PostgreSQL
- File uploads handled via `storage/uploads.py`
- All analysis results saved to database for historical tracking
- External service calls have timeout handling and fallback logic
- CORS configured for local development and production URLs

## Statistical Analysis Capabilities

### Frequentist Statistics
- T-tests (one-sample, two-sample, paired)
- Chi-square tests (independence, goodness of fit)
- ANOVA (one-way, two-way)
- Proportion tests
- P-value calculations and confidence intervals

### Bayesian Statistics
- Beta-Binomial models for conversion rates
- Posterior distribution sampling (MCMC)
- Bayes factor calculations
- Credible intervals (50%, 95%, 99%)
- Hierarchical Bayesian models
- Real-time posterior updating

### Power Analysis
- Sample size calculation for different test types
- Power analysis (detect effect sizes with given sample)
- Sequential testing and early stopping
- Effect size estimation (Cohen's d, Cliff's delta)

## Key Features Implementation Status

### ✅ Completed Backend Features
1. Database schema for A/B testing campaigns and results
2. Statistical analysis functions (frequentist)
3. Bayesian statistical analysis
4. Power analysis and sample size calculation
5. A/B test campaign management service
6. Real-time tracking for A/B test metrics
7. Database schema for timeline events and Bayesian posteriors
8. Key moment detection algorithm
9. Change-point detection for timeline segmentation
10. Temporal correlation analysis
11. Bayesian inference engine for timeline analysis
12. Integration into main API endpoints
13. Unified scoring updated with statistical significance

### LLM Integration
- LLM is used for narrative generation only (no chat functionality)
- Supports OpenAI and Google Gemini models
- Configurable via `PYDANTIC_AI_MODEL` environment variable
- Provides natural language explanations of analysis results

## Important Constraints

### Frontend (Next.js)
- **Breaking Changes**: This is Next.js 16.2.4 with significant API changes from earlier versions
- **Documentation**: Always read `node_modules/next/dist/docs/` before writing code
- **Deprecations**: Heed all deprecation notices in the documentation

### Backend
- **Database**: All database operations are async and use PostgreSQL
- **External Services**: Roboflow and TribeV2 are optional - API functions gracefully handle unavailability
- **File Storage**: Uses local filesystem with configurable paths
- **Error Handling**: External service failures never block core API functionality

### Statistical Rigor
- All A/B tests include both Bayesian and frequentist analysis
- Statistical significance must be established before declaring winners
- Power analysis required before test launch
- Multiple comparison correction applied for multi-variant tests

## Common Tasks

### Adding a New API Endpoint
1. Define Pydantic models in `backend/models/schemas.py`
2. Implement business logic in `backend/services/`
3. Add endpoint in `backend/main.py`
4. Update database operations in `backend/database.py` if needed
5. Test via `/docs` interactive documentation

### Database Schema Changes
1. Modify `database/schema.sql`
2. Update Pydantic models in `backend/database.py`
3. Apply migration to Supabase
4. Update related service layer code

### Adding Statistical Analysis
1. Implement function in `backend/services/statistical_analysis.py` or `bayesian_analysis.py`
2. Add corresponding database table if storing results
3. Integrate with relevant service (ab_test_service or timeline_analysis)
4. Add API endpoint if needed for external access

## Troubleshooting

### Common Issues
- **Database connection fails**: Check `DATABASE_URL` and Supabase credentials
- **TribeV2 unreachable**: Verify `TRIBEV2_URL` and Modal app is running
- **Roboflow errors**: Check `ROBOFLOW_API_KEY` and workflow configuration
- **CORS errors**: Verify `CORS_ORIGINS` includes your frontend URL
- **LLM failures**: Check `OPENAI_API_KEY` or `GOOGLE_API_KEY` configuration

### Debug Mode
- Backend: Set `LOGFIRE_TOKEN` for observability
- Frontend: Use Next.js built-in dev tools
- Database: Query Supabase dashboard directly
- External services: Use `/health` endpoints to check status