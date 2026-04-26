# ArcAnalytics Database Setup

This guide covers setting up the PostgreSQL database for ArcAnalytics on Render hosting.

## Overview

The ArcAnalytics database stores:
- Analysis metadata and configuration
- Variant information (files, scores, segments)
- Visual analysis results
- Brain analysis data
- Usage statistics and benchmarks

## Database Schema

### Core Tables

- **`organizations`** - Client organizations
- **`users`** - Application users
- **`campaigns`** - Marketing campaigns
- **`analyses`** - Analysis sessions and metadata
- **`variants`** - Individual ad variants analyzed
- **`visual_scores`** - Visual analysis scores (purchase, engagement, virality, clarity)
- **`visual_segments`** - Visual analysis segments and regions
- **`brain_analysis`** - TribeV2 brain analysis results
- **`comparisons`** - A/B test comparisons
- **`industry_benchmarks`** - Industry benchmark data
- **`usage_logs`** - API usage tracking
- **`monthly_usage`** - Monthly usage statistics

## Setup Instructions

### 1. Environment Variables

Add these to your `.env` file:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@hostname:5432/database_name
ENVIRONMENT=development  # or 'production' for Render

# Optional: Custom database settings
DB_POOL_SIZE=10
DB_MAX_CONNECTIONS=20
```

### 2. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Run Database Migration

```bash
cd backend
python migrate.py migrate
```

### 4. Verify Database Setup

```bash
python migrate.py verify
```

## Database Operations

### Migration Commands

```bash
# Set up database schema
python migrate.py migrate

# Verify database setup
python migrate.py verify

# Reset database (development only)
python migrate.py reset
```

### Database Models

The database uses SQLAlchemy models defined in `backend/database.py`:

- **DatabaseManager** - Main database connection and operations
- **Analysis/Variants** - Core analysis data
- **Visual Scores/Segments** - Visual analysis results
- **Brain Analysis** - Neural analysis data
- **Usage Tracking** - Statistics and monitoring

## API Integration

### New Endpoints

- `GET /analyses` - List historical analyses
- `GET /analyses/{id}` - Get detailed analysis
- `GET /stats` - Get usage statistics

### Automatic Saving

All analysis results are automatically saved to the database when using the `/analyze-full` endpoint. The API will continue to work even if the database is temporarily unavailable.

## Render Deployment

### 1. Create PostgreSQL Database

1. Go to Render Dashboard
2. Create new PostgreSQL database
3. Note the connection string

### 2. Update Environment Variables

In Render dashboard, add the `DATABASE_URL` environment variable to your backend service.

### 3. Deploy and Migrate

1. Deploy your backend service
2. Run migration script via Render console:
   ```bash
   python backend/migrate.py migrate
   ```

### 4. Verify Setup

```bash
python backend/migrate.py verify
```

## Development Workflow

### Local Development

1. Set up local PostgreSQL or use Docker
2. Configure `DATABASE_URL` in `.env`
3. Run migrations: `python migrate.py migrate`
4. Start backend: `python main.py`

### Testing Database Integration

```bash
# Test database connection
python -c "from backend.database import DatabaseManager; import asyncio; asyncio.run(DatabaseManager().initialize())"

# Test CRUD operations
python -c "
import asyncio
from backend.database import DatabaseManager, AnalysisCreate

async def test():
    db = DatabaseManager()
    await db.initialize()
    
    # Create test analysis
    analysis = AnalysisCreate(
        objective='purchase',
        audience_segment='premium_brand_oriented',
        mode='single'
    )
    analysis_id = await db.create_analysis(analysis)
    print(f'Created analysis: {analysis_id}')
    
    # Fetch analyses
    analyses = await db.get_analyses(limit=5)
    print(f'Found {len(analyses)} analyses')
    
    await db.close()

asyncio.run(test())
"
```

## Schema Updates

When modifying the database schema:

1. Update `database/schema.sql`
2. Update models in `backend/database.py`
3. Create migration script if needed
4. Test with `python migrate.py verify`

## Performance Considerations

- Database connection pooling is configured automatically
- Indexes are set up for common query patterns
- JSON fields are used for flexible data storage
- Connection limits are managed via environment variables

## Troubleshooting

### Common Issues

1. **Connection Failed**: Check `DATABASE_URL` format and network connectivity
2. **Migration Errors**: Verify PostgreSQL version and permissions
3. **Performance Issues**: Check connection pool settings and query patterns

### Debug Mode

Enable debug logging:

```bash
export LOG_LEVEL=DEBUG
python main.py
```

### Database Reset (Development Only)

```bash
python migrate.py reset
```

## Backup and Recovery

### Automated Backups

Render provides automated backups for PostgreSQL databases. Check your Render dashboard for backup settings.

### Manual Backup

```bash
pg_dump $DATABASE_URL > backup.sql
```

### Restore

```bash
psql $DATABASE_URL < backup.sql
```

## Security

- Use strong passwords for database
- Enable SSL connections in production
- Limit database user permissions
- Monitor access logs
- Regular security updates

## Monitoring

### Database Metrics

Monitor:
- Connection pool usage
- Query performance
- Storage usage
- Error rates

### Health Checks

The `/health` endpoint includes database connectivity status.

## Next Steps

1. Set up production database on Render
2. Configure monitoring and alerts
3. Set up backup and recovery procedures
4. Optimize query performance
5. Add database migration automation