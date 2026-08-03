-- ==========================================
-- InsightStox PostgreSQL Database Schema
-- Run this in your Neon SQL Editor to initialize the database
-- ==========================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS "user" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    registrationmethod VARCHAR(50) NOT NULL,
    "investmentExperience" VARCHAR(255),
    "riskProfile" VARCHAR(255),
    "financialGoals" VARCHAR(255),
    "investmentHorizon" VARCHAR(255),
    profile_image TEXT,
    theme VARCHAR(50) DEFAULT 'dark',
    dashboardlayout VARCHAR(50),
    "isAiSuggestionOn" BOOLEAN DEFAULT true
);

-- 2. Active Sessions Table
CREATE TABLE IF NOT EXISTS "active_session" (
    id SERIAL PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL REFERENCES "user"(email) ON DELETE CASCADE,
    browser_type VARCHAR(255),
    os_type VARCHAR(255),
    login_time TIMESTAMP DEFAULT NOW(),
    last_active_time TIMESTAMP DEFAULT NOW()
);

-- 3. Stocks Reference Table (Caching Yahoo Finance data)
CREATE TABLE IF NOT EXISTS "stocks" (
    symbol VARCHAR(100) PRIMARY KEY,
    short_name VARCHAR(255),
    long_name VARCHAR(255),
    sector VARCHAR(100),
    currency VARCHAR(10),
    type VARCHAR(50),
    country VARCHAR(100),
    exchange VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Stock Summary Table (Current holdings)
CREATE TABLE IF NOT EXISTS "stock_summary" (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL REFERENCES "user"(email) ON DELETE CASCADE,
    symbol VARCHAR(100) NOT NULL REFERENCES "stocks"(symbol) ON DELETE CASCADE,
    current_holding NUMERIC NOT NULL DEFAULT 0,
    spended_amount NUMERIC NOT NULL DEFAULT 0,
    avg_price NUMERIC NOT NULL DEFAULT 0,
    realized_gain NUMERIC DEFAULT 0,
    yestarday_holding NUMERIC DEFAULT 0,
    UNIQUE (email, symbol)
);

-- 5. User Transactions Table (Buy/Sell History)
CREATE TABLE IF NOT EXISTS "user_transactions" (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL REFERENCES "user"(email) ON DELETE CASCADE,
    symbol VARCHAR(100) NOT NULL REFERENCES "stocks"(symbol) ON DELETE CASCADE,
    quantity NUMERIC NOT NULL,
    price NUMERIC NOT NULL,
    transaction_type VARCHAR(10) NOT NULL, -- 'BUY' or 'SELL'
    transaction_date TIMESTAMP DEFAULT NOW()
);

-- 6. User Watchlist Table
CREATE TABLE IF NOT EXISTS "user_watchlist" (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL REFERENCES "user"(email) ON DELETE CASCADE,
    symbol VARCHAR(100) NOT NULL REFERENCES "stocks"(symbol) ON DELETE CASCADE,
    UNIQUE (email, symbol)
);
