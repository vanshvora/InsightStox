![InsightStox Logo](https://drive.google.com/uc?export=view&id=1BVzEIrAtxF6D76pE-7wDIwmCHNfI7LPq)


# **InsightStox - Portfolio Analyzer, Tracker and Console**

InsightStox is a web-based platform designed to help investors in tracking, managing and analyzing their stock market portfolios through AI-driven insights. The system simplifies investment decisions for investors and supports them in structuring their strategies. Unlike traditional stock-tracking platforms, InsightStox combines real-time data, personalized AI suggestions, portfolio management and visualization in a single consolidated solution.

The platform is built around three core aspects: portfolio management, intelligent suggestions, and user-centric insights. Investors can securely register and create personalized portfolios, add or remove stocks, and maintain watchlists of potential opportunities. The system fetches real-time stock market data, enabling users to monitor price movements and track performance instantly. To support better decision-making, InsightStox integrates an AI-powered recommendation facility that looks upon user portfolios, analyzes them, suggests possible improvements, highlights risks, and proposes comparative evaluations between different stocks.

In addition to portfolio features, InsightStox provides a highly visual dashboard with interactive charts and reports, making complex financial information accessible and easier to understand. A stock comparison module further allows users to compare two or more options side by side, offering transparency in decision-making. To ensure security and reliability, the system incorporates secure authentication and compliance with financial data protection standards.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TailwindCSS, Chart.js |
| Backend | Python 3, Django 5, Django REST Framework |
| Database | Neon PostgreSQL (serverless) |
| Background Jobs| APScheduler |
| AI / LLM | Groq (LangChain), LangGraph |
| File Storage | Cloudinary |
| Email | Brevo (Sendinblue) |
| Auth | Django Token Authentication, Google OAuth 2.0 |

---

## 🚀 Local Setup & Running

### Prerequisites
- Python 3.11+
- Node.js ≥ 18
- npm ≥ 9
- (Optional) Docker Desktop

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd InsightStox---Portfolio-analyzer-tracker-and-console
```

### 2. Set up environment variables

**Backend:**
```bash
cd backend
cp .env.example .env
# Edit .env and fill in your API keys (see table below)
```

**Frontend:**
```bash
cd ../frontend
cp .env.example .env
# Edit .env and fill in your values
```

### 3. Option A: Run locally with Docker (Recommended)

Make sure Docker Desktop is running, then from the root directory:
```bash
docker-compose up --build (first time)
docker-compose up
```
Frontend will be available at: **http://localhost:5173**  
Backend API runs at: **http://localhost:8000**

### 3. Option B: Run locally without Docker

Open **two terminals**:

```bash
# Terminal 1 – Backend
cd backend
python -m venv .venv
# Activate the virtual environment
# Windows: .\.venv\Scripts\activate
# Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

```bash
# Terminal 2 – Frontend
cd frontend
npm install
npm run dev
```

Frontend will be available at: **http://localhost:5173**  
Backend API runs at: **http://localhost:8000**

---

## 🔑 Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `DJANGO_SECRET_KEY` | Secret key for Django | Generate a random string |
| `DEBUG` | Enable debug mode | `True` for local, `False` for prod |
| `DATABASE_URL` | Neon PostgreSQL connection string | [console.neon.tech](https://console.neon.tech) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | [cloudinary.com/console](https://cloudinary.com/console) |
| `CLOUDINARY_API_KEY` | Cloudinary API key | [cloudinary.com/console](https://cloudinary.com/console) |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | [cloudinary.com/console](https://cloudinary.com/console) |
| `BREVO_API_KEY` | Brevo (Sendinblue) API key | [app.brevo.com/settings/keys/api](https://app.brevo.com/settings/keys/api) |
| `SENDER_EMAIL` | Sender email shown in transactional emails | Your verified Brevo sender email |
| `RATE_EXCHANGE_URL` | Exchange rate API URL | `https://open.er-api.com/v6/latest/USD` (free) |
| `GROQ_API_KEY` | Groq LLM API key | [console.groq.com/keys](https://console.groq.com/keys) |

### Frontend (`frontend/.env`)

| Variable | Description | Value for local dev |
|----------|-------------|---------------------|
| `VITE_BACKEND_LINK` | Backend API base URL | `http://localhost:8000` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID | Your Google Client ID |

---

## 📁 Project Structure

```
InsightStox/
├── backend/          # Django API server
│   ├── ai_insight/    # LangChain/Groq agent apps
│   ├── config/        # Core Django settings and WSGI/ASGI
│   ├── dashboard/     # Market data & summary views
│   ├── feedback/      # User queries and suggestions
│   ├── jobs/          # APScheduler tasks
│   ├── portfolio/     # User transaction & holding views
│   ├── users/         # Authentication and Profile views
│   ├── utils/         # Helper functions (Yahoo Finance, Cloudinary)
│   ├── .env           # Environment variables
│   ├── build.sh       # Deployment script
│   └── manage.py      # Django management script
│
├── frontend/         # React + Vite SPA
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── context/       # React context (AppContext)
│   │   ├── pages/         # Page-level components
│   │   └── utils/         # Helper functions
│   ├── .env.example       # Environment variable template
│   └── index.html
│
└── docker-compose.yml # Docker configuration for local dev
```

---

## 🎥 Demo

- YouTube demonstration: https://youtu.be/93mjWPn2CVE?si=H-PY2bFJqtWPchnB

---

> ⚠️ **Note:** This project was originally developed as a team project (11 members) on Node.js/Express. This is a personal fork where the backend was completely migrated to Python/Django for enhanced data analysis and local development capabilities.