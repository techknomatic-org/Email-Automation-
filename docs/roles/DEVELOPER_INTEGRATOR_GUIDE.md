# OpenOutreach AI — Developer & Integrator Guide

**Target Audience**: Software Engineers, Backend/Frontend Developers, System Integrators.

---

## 🎯 Technical Architecture Overview

OpenOutreach AI is built with Python (FastAPI + SQLAlchemy + Pydantic AI) on the backend and React 18 + Vite on the frontend, with PostgreSQL as the relational and vector database.

```
                          ┌─────────────────────────────┐
                          │   React 18 + Vite Frontend  │
                          │   (http://localhost:5173)   │
                          └──────────────┬──────────────┘
                                         │ REST API (or ngrok tunnel)
                                         ▼
                          ┌─────────────────────────────┐
                          │    FastAPI Backend Server   │
                          │   (http://127.0.0.1:8000)   │
                          └──────────────┬──────────────┘
                                         │
       ┌─────────────────────────────────┼─────────────────────────────────┐
       │                                 │                                 │
       ▼                                 ▼                                 ▼
┌───────────────┐              ┌───────────────────┐             ┌───────────────────┐
│ PostgreSQL 18 │              │ Real AI Web       │             │ SMTP / IMAP SSL   │
│ (Local DB)    │              │ Discovery & LLM   │             │ Transport Layer   │
└───────────────┘              │ (OpenRouter/Llama)│             │ (Gmail App Pass)  │
                               └───────────────────┘             └───────────────────┘
```

---

## 📡 REST API Endpoint Reference

### 1. User Authentication & Session Management
- **`POST /api/v1/auth/register`** (or `/signup`): Registers a new user (`email`, `password`, `full_name`, `role`). Returns signed JWT session token.
- **`POST /api/v1/auth/login`** (or `/signin`): Authenticates credentials against PBKDF2-HMAC-SHA256 hash. Returns signed JWT session token.
- **`GET /api/v1/auth/me`**: Returns authenticated user profile from `Authorization: Bearer <token>` header.
- **`POST /api/v1/auth/logout`**: Acknowledges session termination.

### 2. Site Configuration & Global Meeting Link
- **`GET /api/v1/config`**: Returns global site config including `ai_model`, `llm_api_key`, and `meeting_link`.
- **`PUT /api/v1/config`**: Updates site config. Saves custom Google Meet / Calendly / Zoom URL globally.

### 3. Master Database & CSV Ingestion Endpoints
- **`GET /api/v1/leads`**: Returns lead records from Master Database with optional filtering by campaign or source.
- **`POST /api/v1/leads/reset-master-db`**: Cascade purges child tables (`Deal`, `LeadResearch`, `Suppression`, `EmailEvent`) and `Lead` table. Returns `total_profiles: 0` and `deleted_count`.
- **`POST /api/v1/csv/upload`**: Accepts `file`, `import_as_leads`, `import_mode` (`"append"` vs `"reset"`). Deduplicates records using `LOWER(TRIM(email))` key and returns `import_stats`.

### 4. Campaign Discovery & Strict Conjunction Search
- **`POST /api/v1/campaigns/{campaign_id}/generate-lead-pool`**: Runs `HybridSearchEngine` matching with strict `AND` conjunction across user-specified search keywords.
- **`POST /api/v1/copilot/dataset-accuracy`**: Live evaluates 5-dimensional dataset alignment against ICP requirements.

### 5. Live Campaign Execution, Thread Sync & Action Dispatch
- **`GET /api/v1/pipeline/campaigns/{campaign_id}/execution`**: Returns live campaign execution stats, recent audit events, and runner status.
- **`GET /api/v1/pipeline/deals/{deal_id}/execution`**: Returns 4-tab Inspector panel data (`overview`, `messages` thread with clean stripped text, `ai_decision`, and `timeline` with UTC local times).
- **`POST /api/v1/pipeline/deals/{deal_id}/sync-inbox`**: Triggers real IMAP SSL inbox sync for incoming prospect replies, performs sentiment analysis (`Interested` vs `Unsubscribe`), and updates deal state.
- **`POST /api/v1/pipeline/deals/{deal_id}/send-campaign`**: Dispatches outbound email over SMTP with 15-second server-side idempotency preventing duplicate sends.
- **`POST /api/v1/pipeline/deals/{deal_id}/execute-action`**: Accepts payload `{"meeting_link": "https://meet.google.com/..."}`. Dispatches real SMTP email, updates state (`Sales Handoff` for meeting requests / `Email Sent` for follow-ups / `Unsubscribed` for opt-outs).

---

## 💻 Database Auto-Migration & Schema

Auto-migrations run during `init_db()` in `backend/app/core/database.py`:

```python
# User model initialization and default admin seeding
import backend.app.models.user
Base.metadata.create_all(bind=engine)
seed_default_user()
```
