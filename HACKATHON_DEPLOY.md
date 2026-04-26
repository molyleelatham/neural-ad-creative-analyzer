# 🚀 ArcAnalytics Deployment Guide

Quick deployment guide for hackathon and production environments.

## ⚡ One-Click Render Deployment (Recommended)

1. **Fork & Push**
   ```bash
   git clone https://github.com/molyleelatham/arcanalytics.git
   # Make your changes
   git push origin main
   ```

2. **Connect to Render**
   - Go to [render.com](https://render.com)
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Render auto-detects `render.yaml` configuration

3. **Set Environment Variables**
   In Render dashboard → Environment:
   ```
   DATABASE_URL=postgresql://...
   OPENAI_API_KEY=your_openai_key
   GOOGLE_API_KEY=your_google_key
   ROBOFLOW_API_KEY=your_roboflow_key
   ROBOFLOW_WORKSPACE=your_workspace
   ROBOFLOW_PROJECT=your_project
   ROBOFLOW_VERSION=your_version
   ```

4. **Deploy** 🎉
   - Render automatically builds and deploys
   - Backend, frontend, and database provisioned automatically
   - Your app will be live at `https://your-app.onrender.com`

## 🏗️ Manual Local Development

### Prerequisites
```bash
# Check versions
node --version    # Should be 18+
python3 --version # Should be 3.14+
```

### Setup
```bash
# 1. Clone and setup
git clone https://github.com/molyleelatham/arcanalytics.git
cd arcanalytics

# 2. Environment
cp .env.example .env
# Edit .env with your API keys

# 3. Backend
cd backend
python3 -m pip install -r requirements.txt
python3 main.py

# 4. Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Access
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 🔧 Required API Keys

Get these keys before deployment:

### OpenAI
- Visit [platform.openai.com](https://platform.openai.com)
- Create API key
- Add to environment variables

### Google AI
- Visit [ai.google.dev](https://ai.google.dev)
- Create API key
- Add to environment variables

### Roboflow
- Visit [roboflow.com](https://roboflow.com)
- Create workspace and project
- Get API key, workspace, project, version
- Add to environment variables

## 🗄️ Database Setup

### Render (Automatic)
- Render PostgreSQL is provisioned automatically
- Connection string provided in Render dashboard

### Local
```bash
# Install PostgreSQL
brew install postgresql  # macOS
sudo apt install postgresql  # Ubuntu

# Create database
createdb arcanalytics

# Setup tables
psql arcanalytics -f database/schema.sql
```

## 🐛 Common Issues & Fixes

### Build Failures
```bash
# Clear node modules
rm -rf frontend/node_modules
cd frontend && npm install

# Clear Python cache
find . -name "__pycache__" -type d -exec rm -rf {} +
```

### Database Connection
```bash
# Test connection
python3 -c "import backend.database; print('Database OK')"
```

### API Key Issues
- Verify all keys are set in environment
- Check for trailing spaces in keys
- Ensure keys have proper permissions

## 📱 Testing Your Deployment

1. **Health Check**
   - Visit `/api/health` endpoint
   - Should return `{"status": "ok"}`

2. **Upload Test**
   - Navigate to Analyze page
   - Upload a test image
   - Verify analysis completes

3. **API Test**
   ```bash
   curl -X POST http://localhost:8000/analyze \
     -F "file=@test-image.jpg"
   ```

## 🚀 Production Optimizations

### Performance
- Enable Redis caching (optional)
- Configure CDN for static assets
- Set up monitoring and alerts

### Security
- Enable HTTPS (automatic on Render)
- Set up API rate limiting
- Configure CORS properly

### Scaling
- Render automatically scales based on load
- Consider larger instances for high traffic
- Set up database backups

## 🆘 Emergency Rollback

If deployment fails:
```bash
# Rollback to previous commit
git log --oneline
git revert <commit-hash>
git push origin main
```

## 📞 Support

- **Documentation**: Check README.md
- **API Docs**: Visit `/docs` endpoint
- **Issues**: Create GitHub issue
- **Quick Fix**: Redeploy on Render

---

**🎯 Your ArcAnalytics app should be live in under 10 minutes!**