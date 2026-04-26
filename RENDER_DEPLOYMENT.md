# Render Database Setup Guide

This guide walks you through setting up the ArcAnalytics PostgreSQL database on Render.

## Prerequisites

- Render account (free tier is sufficient)
- ArcAnalytics codebase with database integration
- Git repository connected to Render

## Step 1: Update render.yaml

The `render.yaml` file has been updated with:

1. **Database Configuration**:
   ```yaml
   databases:
     - name: arcanalytics-db
       databaseName: arcanalytics
       user: arcanalytics_user
       region: oregon
       plan: starter
       postgresMajorVersion: 16
   ```

2. **Backend Database Connection**:
   ```yaml
   envVars:
     - key: DATABASE_URL
       fromDatabase:
         name: arcanalytics-db
         property: connectionString
   ```

3. **Automatic Migration**:
   ```yaml
   buildCommand: pip install -r backend/requirements.txt && python backend/migrate.py migrate
   ```

## Step 2: Deploy to Render

### Option A: Via Render Dashboard

1. **Connect Repository**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the `arcanalytics-merge-test` repository

2. **Configure Services**:
   - Render will automatically detect the `render.yaml` configuration
   - Review the configuration (3 services: backend, frontend, database)
   - Click "Create Web Service"

3. **Database Creation**:
   - Render will automatically create the PostgreSQL database
   - The database connection string will be injected as `DATABASE_URL`
   - Migration script will run automatically during build

### Option B: Via Render CLI

```bash
# Install Render CLI
npm install -g @render/cli

# Login to Render
render login

# Deploy from repository root
render deploy
```

## Step 3: Monitor Deployment

### Database Setup

1. **Database Status**:
   - Go to Render Dashboard → Databases
   - Check `arcanalytics-db` status
   - Note the connection details (automatically configured)

2. **Migration Logs**:
   - Go to Backend Service → Logs
   - Look for migration output:
     ```
     🚀 Starting ArcAnalytics database migration...
     ✅ Database connection established
     ✅ Database schema created successfully
     ✅ Migration completed successfully!
     ```

### Backend Health Check

1. **Service Health**:
   - Backend should show "Live" status
   - Health check at `/health` should pass

2. **Database Connection**:
   - Check backend logs for:
     ```
     ✅ Database connection initialized
     ```

## Step 4: Verify Database Setup

### Using Render Console

1. **Open Console**:
   - Go to Backend Service → Console
   - Start a new console session

2. **Run Verification**:
   ```bash
   cd /opt/render/project/src
   python backend/migrate.py verify
   ```

3. **Expected Output**:
   ```
   🔍 Verifying database setup...
   📋 Database tables:
     ✅ organizations
     ✅ users
     ✅ campaigns
     ✅ analyses
     ✅ variants
     ✅ visual_scores
     ✅ visual_segments
     ✅ brain_analysis
     ✅ comparisons
     ✅ industry_benchmarks
     ✅ usage_logs
     ✅ monthly_usage
   
   📊 Table row counts:
     organizations: 0 rows
     users: 0 rows
     ...
   ✅ Database verification completed
   ```

### Test API Endpoints

1. **Health Check**:
   ```bash
   curl https://your-backend-url.onrender.com/health
   ```

2. **Stats Endpoint**:
   ```bash
   curl https://your-backend-url.onrender.com/stats
   ```

3. **Analyses Endpoint**:
   ```bash
   curl https://your-backend-url.onrender.com/analyses
   ```

## Step 5: Configure Frontend

1. **Update CORS Origins**:
   - Go to Backend Service → Environment
   - Add `CORS_ORIGINS` with your frontend URL:
     ```
     https://your-frontend-url.onrender.com
     ```

2. **Restart Backend**:
   - Save environment variables
   - Backend will restart automatically

## Step 6: Test Full Integration

1. **Upload Test Image**:
   - Go to your frontend URL
   - Upload an image for analysis
   - Check that analysis completes successfully

2. **Check Database Persistence**:
   - After analysis, check `/analyses` endpoint
   - Verify that the new analysis appears in the list

3. **Check Backend Logs**:
   - Look for database save confirmation:
     ```
     ✅ Analysis 1 saved to database
     ```

## Troubleshooting

### Common Issues

1. **Migration Fails**:
   - Check backend build logs
   - Verify DATABASE_URL is correctly set
   - Ensure database is in "Live" status

2. **Database Connection Errors**:
   - Check backend logs for connection errors
   - Verify database credentials
   - Check network connectivity

3. **CORS Issues**:
   - Ensure CORS_ORIGINS includes frontend URL
   - Restart backend after updating CORS settings

### Debug Commands

```bash
# Check database connection
curl https://your-backend-url.onrender.com/health

# Check database tables
curl https://your-backend-url.onrender.com/stats

# Test analysis endpoint
curl -X POST https://your-backend-url.onrender.com/analyze-full \
  -F "objective=purchase" \
  -F "audience_segment=premium_brand_oriented" \
  -F "files=@test-image.jpg"
```

### Database Reset (Emergency Only)

```bash
# In Render Console
cd /opt/render/project/src
python backend/migrate.py reset
```

## Production Considerations

### Security

1. **Database Security**:
   - Use strong database password (auto-generated by Render)
   - Enable SSL (automatic on Render)
   - Limit database access to backend service only

2. **API Security**:
   - Set up API keys for production
   - Enable rate limiting
   - Monitor access logs

### Performance

1. **Database Optimization**:
   - Monitor connection pool usage
   - Check query performance
   - Set up database backups

2. **Backend Scaling**:
   - Monitor resource usage
   - Scale up if needed
   - Set up monitoring alerts

### Backup and Recovery

1. **Automatic Backups**:
   - Render provides automatic daily backups
   - Check backup retention settings

2. **Manual Backup**:
   ```bash
   # In Render Console
   pg_dump $DATABASE_URL > backup.sql
   ```

## Next Steps

1. **Monitor Performance**: Set up monitoring and alerts
2. **Add Analytics**: Implement usage tracking and analytics
3. **Scale as Needed**: Upgrade plans based on usage
4. **Security Review**: Regular security audits and updates

## Support

- **Render Documentation**: https://render.com/docs
- **Database Issues**: Check Render status page
- **Application Issues**: Check application logs and metrics

Your ArcAnalytics application is now ready with a fully functional PostgreSQL database on Render! 🚀