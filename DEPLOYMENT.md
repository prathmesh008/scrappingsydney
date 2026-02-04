# Deployment Guide

## 1. Prerequisites
- **GitHub Account**: To host the code.
- **Render/Railway/Heroku Account**: For Backend & DB.
- **Vercel/Netlify Account**: For Frontend.
- **MongoDB Atlas**: You already have this.

---

## 2. Deploying Backend (Node.js)
We recommend **Render** or **Railway** for free/cheap Node.js hosting.

1.  **Push code** to GitHub.
2.  **Create New Web Service** on Render.
3.  **Connect GitHub Repo**: Select `sydneyscrapper`.
4.  **Settings**:
    *   **Root Directory**: `backend`
    *   **Build Command**: `npm install`
    *   **Start Command**: `node index.js`
5.  **Environment Variables**:
    *   Add `MONGO_URI` (Copy from your `.env`).
    *   Add `PORT` = `10000` (Render default) or leave as 5001 if configurable.

---

## 3. Deploying Frontend (React)
We recommend **Vercel**.

1.  **Create New Project** on Vercel.
2.  **Import GitHub Repo**: Select `sydneyscrapper`.
3.  **Settings**:
    *   **Root Directory**: `frontend`
    *   **Framework Preset**: Vite
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `dist`
4.  **Environment Variables**:
    *   Add all `VITE_FIREBASE_...` keys from your `.env`.

---

## 4. Deploying Telegram Bot (Python)
The bot uses **Ollama (Local LLM)**. This makes deployment tricky because standard cheap cloud servers (like basic Droplets) cannot run LLMs easily.

**Option A: Cloud GPU (Recommended for Production)**
1.  Rent a small GPU server (e.g., Lambda Labs, RunPod, or a larger AWS instance).
2.  Install Ollama: `curl -fsSL https://ollama.com/install.sh | sh`.
3.  Clone the repo.
4.  Install dependencies: `pip install -r telegram_bot/requirements.txt`.
5.  Run: `python telegram_bot/main.py`.

**Option B: Switch to OpenAI/Gemini (Easier Deployment)**
If you don't want to manage a GPU server, modify `telegram_bot/database_manager.py` to use `OpenAIEmbeddings` instead of Ollama, and deploy the python script as a **Background Worker** on Render/Heroku.

**Option C: Run Locally (Current)**
Since this is a "local friend" bot, running it on your own computer (Mac) is a perfectly valid "deployment" if you just leave the terminal open!
