
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
| Backend | Node.js, Express 5 |
| Primary DB | Neon PostgreSQL (serverless) |
| Secondary DB | MongoDB (session & job metadata) |
| AI / LLM | Groq (LangChain), LangGraph |
| File Storage | Cloudinary |
| Email | Brevo (Sendinblue) |
| Auth | JWT, Google OAuth 2.0 |

---

## 🚀 Local Setup & Running

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9

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

### 3. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 4. Run locally

Open **two terminals**:

```bash
# Terminal 1 – Backend
cd backend
npm run server
```

```bash
# Terminal 2 – Frontend
cd frontend
npm run dev
```

Frontend will be available at: **http://localhost:5173**  
Backend API runs at: **http://localhost:8000**

---

## 🔑 Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `PORT` | Backend server port (default: 8000) | — |
| `FRONTEND_LINK` | Your frontend URL | `http://localhost:5173` for local |
| `DATABASE_URL` | Neon PostgreSQL connection string | [console.neon.tech](https://console.neon.tech) |
| `MONGODB_URL` | MongoDB connection string | [cloud.mongodb.com](https://cloud.mongodb.com) |
| `JWT_SECRET` | Secret key for JWT signing | Generate a random string |
| `JWT_EXPIRE` | JWT expiry duration (e.g. `7d`) | — |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | [cloudinary.com/console](https://cloudinary.com/console) |
| `CLOUDINARY_API_KEY` | Cloudinary API key | [cloudinary.com/console](https://cloudinary.com/console) |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | [cloudinary.com/console](https://cloudinary.com/console) |
| `brevo_API` | Brevo (Sendinblue) API key | [app.brevo.com/settings/keys/api](https://app.brevo.com/settings/keys/api) |
| `GOOGLE_USER_EMAIL` | Sender email shown in transactional emails | Your verified Brevo sender email |
| `JIGSAWSTACK_API_KEY` | JigsawStack API key (market news) | [jigsawstack.com/dashboard](https://jigsawstack.com/dashboard) |
| `RATE_EXCHANGE` | Exchange rate API URL | `https://open.er-api.com/v6/latest/USD` (free) |
| `GROQ_API_KEY` | Groq LLM API key | [console.groq.com/keys](https://console.groq.com/keys) |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |

### Frontend (`frontend/.env`)

| Variable | Description | Value for local dev |
|----------|-------------|---------------------|
| `VITE_BACKEND_LINK` | Backend API base URL | `http://localhost:8000` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID | Same as backend `GOOGLE_CLIENT_ID` |

---

## 📁 Project Structure

```
InsightStox/
├── backend/          # Express.js API server
│   ├── src/
│   │   ├── controllers/   # Route handlers
│   │   ├── db/            # Neon PostgreSQL connection
│   │   ├── middlewares/   # Auth & validation middleware
│   │   ├── mongodb/       # MongoDB connection
│   │   ├── mongoModels/   # Mongoose models
│   │   ├── routes/        # Express routers
│   │   └── utils/         # Utilities, AI agent, email, Cloudinary
│   ├── .env.example       # Environment variable template
│   └── index.js           # Server entry point
│
└── frontend/         # React + Vite SPA
    ├── src/
    │   ├── components/    # Reusable UI components
    │   ├── context/       # React context (AppContext)
    │   ├── pages/         # Page-level components
    │   └── utils/         # Helper functions
    ├── .env.example       # Environment variable template
    └── index.html
```

---

## 🎥 Demo

- YouTube demonstration: https://youtu.be/93mjWPn2CVE?si=H-PY2bFJqtWPchnB

---

> ⚠️ **Note:** This project was originally developed as a team project (11 members). This is a personal fork for local development and experimentation.