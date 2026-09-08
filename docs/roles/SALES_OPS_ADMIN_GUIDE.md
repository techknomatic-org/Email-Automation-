# OpenOutreach AI — Sales Operations & System Admin Guide

**Target Audience**: Sales Operations Managers, System Administrators, IT Operations.

---

## 🎯 Role Overview

As a Sales Operations Manager or Admin, your responsibilities include managing backend environment variables, authenticating sending mailboxes via Gmail App Passwords over SMTP/IMAP SSL, configuring global meeting links, uploading product collateral to the RAG Knowledge Base, and enforcing compliance/suppression policies.

---

## ⚙️ Backend Environment Setup (`.env`)

Configure your environment settings in `.env`:

```env
# Database Credentials
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/openoutreach
DB_HOST=localhost
DB_PORT=5432
DB_NAME=openoutreach
DB_USER=postgres
DB_PASSWORD=postgres

# AI LLM Provider Configuration
AI_API_KEY=your_openrouter_or_openai_api_key
AI_MODEL=meta-llama/llama-3.1-8b-instruct:free
VITE_API_BASE_URL=http://localhost:8000
SECRET_KEY=your_secure_jwt_secret_key_here

# Lead Discovery Settings
LEAD_DISCOVERY_PROVIDER=web_search
```

---

## 🔐 User Authentication & Account Administration

OpenOutreach includes a built-in multi-user authentication system with role-based access control:

1. **Default Administrator Account**:
   - **Email**: `admin@openoutreach.ai`
   - **Password**: `Admin123!`
   - **Role**: `Director of Growth` / Admin
   - **Quick Sign-In**: Click **⚡ One-Click Quick Demo Sign In** on the Sign In page for instant access.
2. **Account Creation & User Roles**:
   - New team members can register via the **Create Account** tab.
   - Supported designations: `Director of Growth`, `Sales Leader / VP`, `Account Executive`, `Sales Development Rep (SDR)`, `Founder / CEO`, `Revenue Operations`.
3. **Session & Security Standards**:
   - Passwords are encrypted using **PBKDF2 with SHA-256 and unique 16-byte random salts** (100,000 iterations).
   - Session tokens are URL-safe signed HMAC-SHA256 JWTs with 7-day expiration.
   - User profile cards in the **Sidebar** and **Settings** page allow quick session inspection and secure 1-click sign out.

---

## ✉️ Mailbox Connections (Gmail App Passwords)

OpenOutreach AI uses direct SMTP (`smtp.gmail.com:587`) and IMAP SSL (`imap.gmail.com:993`) connection for sending campaign emails and syncing real replies:

1. Go to **Mailboxes** tab in the Web UI.
2. Click **Connect New Mailbox** -> **Custom SMTP / Gmail App Password**.
3. Enter:
   - **Host**: `smtp.gmail.com`
   - **Port**: `587`
   - **IMAP Host**: `imap.gmail.com`
   - **IMAP Port**: `993`
   - **Username**: Your email address
   - **Password**: 16-character Gmail App Password (generated in Google Account Security)
4. Click **Save & Test Connection**.

## 💾 Master Database & Dataset Ingestion Management

As an Admin or Sales Ops lead, you manage the unified Master Database (`/masterdb` tab):

1. **Master Database Overview**:
   - Access the **Master Database** view from the side navigation bar.
   - Monitor real-time metrics: `Total Profiles`, `CSV / Excel Imports`, `Manual Entries`, and `Dataset Status` (`Ready` / `Empty`).
   - Use live search and source filtering (`All Sources`, `CSV / Excel Uploads`, `Manual Entries`) to audit lead records.
2. **Dataset Import Options (Step-by-Step)**:
   - **Option A (Append New Data)**: Keeps existing records. Ingests new records using `LOWER(TRIM(email))` deduplication key to skip duplicates.
   - **Option B (Reset & Upload New Dataset)**: Prompts confirmation popup (`ConfirmModal`) $\rightarrow$ cascade purges child tables (`Deal`, `LeadResearch`, `Suppression`, `EmailEvent`) and `Lead` table $\rightarrow$ imports new dataset.
   - **Option C (Add Records Manually)**: Opens the manual profile creation form.
   - **Import Summary Popup**: Displays exact import breakdown: Total Rows Processed, Records Added, Records Skipped (Duplicates), Invalid Rows, and Master DB Total Profiles.
3. **Format / Reset Master Database**:
   - Click **Format / Reset DB** (Red Button) to purge all lead data. Requires explicit confirmation and executes cascade table deletion.

---

## 🔒 Security & Data Hygiene Rules

1. **Global Suppression Enforcement**:
   - Any prospect who clicks unsubscribe or emails requesting opt-out (*"stop"*, *"remove me"*, *"not interested"*) is automatically added to the `suppressions` table.
   - Suppressed emails are blocked across **all existing and future campaigns**.
2. **Clean Reply Parsing**:
   - The IMAP sync engine strips quoted email lines (`>` or `On ... wrote:`) to isolate and log clean prospect response text.

---

## 🧠 Knowledge Base (RAG) Management

1. Go to **Knowledge Base** tab in the Web UI.
2. Upload product whitepapers, case studies, or PDF collateral.
3. The RAG service converts documents into FastEmbed vectors stored in PostgreSQL.
4. When reps generate emails, the RAG system extracts relevant snippets to ground AI responses.
