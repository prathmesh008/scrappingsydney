# Sydney Event Aggregation Patform

A full-stack Event Aggregation Platform for Sydney, Australia.
Built including a Scraping Engine, Backend API, and React Frontend with Admin Dashboard.

##  Quick Start

### Prerequisites
- Node.js (v14+)
- MongoDB (Running locally or provide URI)

### 1. Setup Backend
```bash
cd backend
npm install
# Create a .env file if not exists (default provided)
npm run dev
# Server runs on http://localhost:5000
```

### 2. Setup Frontend
```bash
cd frontend
npm install
npm run dev
# Client runs on http://localhost:5173
```

##  Architecture

### Scraping Engine (`backend/scraper`)
- **Target**: `whatson.cityofsydney.nsw.gov.au`
- **Strategy**: 
  - Tries to parse **JSON-LD (Schema.org)** for structured data (high reliability).
  - Fallback to CSS Selectors if JSON-LD is missing.
- **Auto-Update Logic**:
  - `New`: Event doesn't exist in DB.
  - `Updated`: Event exists but fields (Title/Date) have changed.
  - `Inactive`: Event no longer found (requires full-scrape comparison).
  - `Imported`: Admin has reviewed and approved the event.

### Backend (`backend/`)
- **Express.js API**: RESTful endpoints.
- **MongoDB**: Stores `Events` and `Leads`.
- **Endpoints**:
  - `POST /api/scrape`: Manual trigger for scraper.
  - `GET /api/events`: Public listing (filters supported).
  - `PATCH /api/events/:id/import`: Admin approval.
  - `POST /api/leads`: User "Get Tickets" action.

### Frontend (`frontend/`)
- **React + Tailwind CSS**: Modern, responsive UI.
- **Pages**:
  - `Home`: Public event feed. Click "Get Tickets" to capture lead & redirect.
  - `Admin Dashboard`: Secure view to trigger scrapes, review status (`new` vs `updated`), and `Import` events.
- **Auth**: Google OAuth (Firebase). Defaults to "Demo Admin" if no config provided.

##  Authentication
- Configure Firebase in `frontend/src/firebase.js`.
- If no keys are found, the app gracefully falls back to a **Demo Admin** (Mock Mode) so you can test the dashboard immediately.

##  Testing the Pipeline
1. **Start Backend & Frontend**.
2. **Go to Admin Dashboard** (Login as Demo Admin).
3. **Click "Run Scraper"**. Watch console logs in backend terminal.
4. **Refresh Dashboard**. See events with status `new`.
5. **Click "Import"** on an event to approve it.
6. **Go to Home Page**. The imported event now appears for the public.
7. **Click "Get Tickets"**. Enter email to test Lead Capture.

##  Constraints & Decisions
- **Cheerio vs Puppeteer**: Used Cheerio for speed and simplicity as requested, unless dynamic rendering blocks it (City of Sydney site usually works with static fetch).
- **Update Logic**: Uses `sourceUrl` as unique key. 
