# ArcAnalytics

AI-powered ad analytics platform with computer vision and brain analysis capabilities.

## 🚀 Features

- **Computer Vision Analysis** - SAM3 visual segmentation and scoring
- **Brain Analysis** - Neural response prediction via TribeV2
- **Real-time Dashboard** - Live data visualization and analytics
- **Database Persistence** - PostgreSQL backend with full historical data
- **Modern UI** - Minimalist design with OKLCH color system
- **Production Ready** - Deployed on Render with automatic scaling

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │     Backend      │    │   Database      │
│   (Next.js)     │◄──►│   (FastAPI)      │◄──►│  (PostgreSQL)   │
│   TypeScript    │    │     Python       │    │   Render        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📊 Core Capabilities

### Analysis Pipeline
- **Visual Scoring**: Purchase, Engagement, Virality, Clarity metrics
- **Segmentation**: Automatic visual element detection
- **Brain Analysis**: Neural response prediction
- **A/B Testing**: Compare multiple ad variants

### Dashboard Features
- **Real-time Analytics**: Live data from database
- **Historical Tracking**: Complete analysis history
- **Performance Metrics**: Top performers and trends
- **Usage Statistics**: System health and activity

## 🎯 Quick Start

### Prerequisites
- Node.js 20+
- Python 3.12+
- PostgreSQL (optional - uses Render in production)

### Local Development

1. **Clone and setup**
   ```bash
   git clone https://github.com/molyleelatham/arcanalytics.git
   cd arcanalytics
   ```

2. **Frontend setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Backend setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   python main.py
   ```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL=your_database_url

# AI Services
ROBOFLOW_API_KEY=your_roboflow_key
TRIBEV2_URL=your_tribev2_url
GOOGLE_API_KEY=your_google_key

# Configuration
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000
```

## 🚀 Deployment

### Render Deployment (Recommended)

1. **Connect repository** to [Render Dashboard](https://dashboard.render.com)
2. **Auto-detects** `render.yaml` configuration
3. **Deploys** frontend, backend, and database automatically

### Manual Deployment

- **Frontend**: Vercel, Netlify, or any Node.js host
- **Backend**: Render, Railway, or any Python host
- **Database**: Render PostgreSQL, AWS RDS, or similar

## 📡 API Endpoints

### Core Analysis
- `POST /analyze-full` - Complete analysis with visual + brain scoring
- `POST /analyze` - Basic visual analysis only

### Data Management
- `GET /analyses` - List historical analyses
- `GET /analyses/{id}` - Get detailed analysis
- `GET /stats` - Usage statistics

### System
- `GET /health` - Health check
- `GET /` - API documentation

## 🗄️ Database Schema

### Core Tables
- **analyses** - Analysis sessions and metadata
- **variants** - Individual ad variants
- **visual_scores** - Visual analysis results
- **brain_analysis** - Neural analysis data
- **visual_segments** - Visual element segments

### Supporting Tables
- **organizations** - Client management
- **campaigns** - Marketing campaigns
- **industry_benchmarks** - Industry comparison data
- **usage_logs** - Activity tracking

## 🎨 Design System

### Color Palette (OKLCH)
- **Accent**: `oklch(0.55 0.18 180)` - Primary blue
- **Accent2**: `oklch(0.75 0.15 60)` - Secondary yellow
- **Dark Mode**: Full support with automatic switching

### Typography
- **Sans**: Inter (UI elements)
- **Serif**: Playfair Display (headings)

### Components
- **V3Nav** - Glassmorphic navigation
- **V3Aurora** - Animated background
- **V3Wordmark** - Logo component

## 🔧 Technology Stack

### Frontend
- **Framework**: Next.js 14 with TypeScript
- **Styling**: CSS-in-JS with custom design system
- **State**: React hooks and context
- **Build**: Optimized for production

### Backend
- **Framework**: FastAPI with Python 3.12
- **Database**: PostgreSQL with asyncpg
- **AI**: Pydantic AI with OpenAI/Gemini
- **Image**: OpenCV and Pillow

### Infrastructure
- **Hosting**: Render (frontend, backend, database)
- **CDN**: Automatic asset optimization
- **Monitoring**: Built-in health checks
- **Security**: CORS and environment variables

## 📈 Performance

- **Analysis Speed**: < 30 seconds per image
- **Database**: Optimized queries with indexing
- **Frontend**: < 2 second initial load
- **API**: < 500ms response times

## 🔒 Security

- **Environment Variables**: Sensitive data protected
- **CORS**: Restricted to authorized domains
- **Database**: Internal network access only
- **Input Validation**: Comprehensive error handling

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Documentation**: See `/docs` directory
- **Issues**: GitHub Issues
- **Email**: support@arcanalytics.com

---

**Built with ❤️ using modern web technologies**