# OpenOutreach AI — Master User Guide & Platform Handbook

Welcome to the **OpenOutreach AI Master User Guide & Handbook**. This handbook provides comprehensive instructions tailored to your specific organizational role, helping you maximize the power of AI-driven B2B campaign intelligence, real AI web search discovery, personalized outreach, IMAP reply monitoring, and live deal pipeline execution.

---

## 📚 Handbook Directory by Role

Select your role below to jump directly to your specialized guide:

| Organizational Role | Primary Responsibilities | Key Documentation |
| :--- | :--- | :--- |
| **[1. SDRs & Account Executives](#1-sales-development-reps-sdrs--account-executives)** | Lead review, Lead 360° research, email personalization, Gmail SMTP sending, deal inspector monitoring, and execute next action. | [`docs/roles/SDR_BDR_GUIDE.md`](file:///c:/Users/pooja.khalekar/Desktop/email/OpenOutreach-main/docs/roles/SDR_BDR_GUIDE.md) |
| **[2. Growth & Demand Gen Managers](#2-growth--demand-generation-managers)** | Campaign strategy creation, natural language ICP prompts, AI strategy inspection, meeting link configuration, and conversion analytics. | [`docs/roles/GROWTH_MARKETING_GUIDE.md`](file:///c:/Users/pooja.khalekar/Desktop/email/OpenOutreach-main/docs/roles/GROWTH_MARKETING_GUIDE.md) |
| **[3. Sales Operations & Admins](#3-sales-operations--system-administrators)** | Settings configuration, Gmail App Password SMTP/IMAP connections, global meeting link setup, RAG Knowledge Base management, and suppression enforcement. | [`docs/roles/SALES_OPS_ADMIN_GUIDE.md`](file:///c:/Users/pooja.khalekar/Desktop/email/OpenOutreach-main/docs/roles/SALES_OPS_ADMIN_GUIDE.md) |
| **[4. Developers & Technical Integrators](#4-developers--technical-integrators)** | System architecture, Real AI Web Search discovery engine, FastAPI backend endpoints, React Vite components, and PostgreSQL database schemas. | [`docs/roles/DEVELOPER_INTEGRATOR_GUIDE.md`](file:///c:/Users/pooja.khalekar/Desktop/email/OpenOutreach-main/docs/roles/DEVELOPER_INTEGRATOR_GUIDE.md) |

---

## 🎯 Executive Overview of OpenOutreach AI

OpenOutreach AI is a self-hosted, **ChatGPT-Style Campaign Intelligence and Autonomous Outbound Execution Platform**.

```mermaid
flowchart TD
    A[Campaign Creation & Target Prompt] --> B[ChatGPT-Style AI Campaign Intelligence & Prompt Interpreter]
    B --> C[Abbreviation Normalization & Slash Parsing e.g. PBI -> Power BI]
    C --> D[PostgreSQL Pgvector Hybrid Search & Dataset Scope Isolation]
    D --> E[Live Dataset Match Accuracy Engine: Role, Dept, KW, Ind, Loc %]
    E --> F[Lead 360° Intent Research & Scoring]
    F --> G[Campaign Lead Pool & Deal Pipeline]
    G --> H[Personalized AI Email Generation with Editable To, Cc, Bcc]
    H --> I[Real SMTP Email Dispatch via Gmail App Passwords & PDF Attachment]
    I --> J[IMAP SSL Reply Sync & Exact Sender Verification]
    J --> K[AI Reply Sentiment Classifier: Interested vs Unsubscribe]
    K --> L[Context-Aware Action Execution vs Sequence Halting on Opt-Out]
```

### Core Architecture Principles
1. **User Authentication & Session Security**: Multi-user authentication supporting Sign In, Sign Up / Registration, and Logout with PBKDF2-HMAC-SHA256 password hashing and signed JWT session management. Includes 1-click Quick Demo Sign In (`admin@openoutreach.ai` / `Admin123!`).
2. **Master Database Single Source of Truth (`/masterdb`)**: All profiles uploaded via CSV/Excel datasets or added manually are unified into the `Lead` table. Provides live profile metrics, search/filter controls, and cascade database format/reset controls.
3. **Step-by-Step Dataset Ingestion & Breakdown Summary**: Features Option A (Append with `LOWER(TRIM(email))` deduplication), Option B (Reset DB & Upload with mandatory confirmation dialog), Option C (Manual Entry), and an Import Summary Popup with vertical scroll support displaying total rows processed, added, skipped duplicates, and invalid records.
4. **Strict Conjunction (`AND` Condition) Search Keywords**: Multi-keyword search strategies strictly enforce that every candidate lead must match **all** specified search keywords across job titles, departments, industries, company info, and profile text.
5. **ChatGPT-Style Strategy Derivation & Department Matching**: Natural language campaign prompts (e.g., `"bdo financial services"`, `"business development c-level"`, `"pbi finance director"`) are dynamically converted into target departments (`Business Development`, `Commercial`, `Finance`, `HR`, `IT`, `Operations`), normalized acronyms (`PBI → Power BI`, `BDO → Business Development`), and domain keywords.
6. **Dataset Match Accuracy & Fallback Vector Discovery**: Lead discovery evaluates candidates against campaign target criteria with dataset scope isolation (`Lead.source_file`). If strict conjunction filters yield zero rows, intelligent fallback vector scoring ranks active profiles in the Master Database.
7. **100% Primary Inbox Deliverability & Contextual AI Follow-Up**: Dispatches emails over standard SMTP/IMAP credentials with RFC-compliant headers (no bulk/promotions flags) to reach the Primary Inbox. Features a 15-second idempotent debounce against duplicate sends, bidirectional thread sync (`💬 Previous Emails (N)`), and a 1-click **`🔄 Generate AI Follow-Up Mail`** generator.
8. **Localhost / Remote Access**: Runs locally (`http://127.0.0.1:8000` backend, `http://localhost:5173` frontend, PostgreSQL on `5432`). Compatible with ngrok tunnels (`ngrok http 5173`).

---

## 1. Sales Development Reps (SDRs & Account Executives)

### 📌 Daily Workflow

#### Step 1: Review the Campaign Lead Pool
- Go to the **Leads** tab in top navigation.
- Select your active campaign from the dropdown.
- View real B2B prospects discovered for that campaign.
- Select individual or bulk leads and click **✓ Add to Deals & Pipeline**. The platform will automatically transition to the **Deals & Pipeline** section.

#### Step 2: Compare Dual Email Options (Option A & Option B) & Customize Recipient
- In **Deals & Pipeline**, click **👁️ Preview** on any deal card.
- **Stacked Dual Variants**: View **Option A (Direct Value Pitch)** and **Option B (High Curiosity Pitch)** stacked vertically on screen to compare both AI-generated versions simultaneously.
- **Edit Recipient Email**: Click **`✏️ Edit Email`** in the header to change or enter a custom target email address (e.g. `another.person@company.com`).
- **Edit Email Body**: Click **✏️ Edit Option A** or **✏️ Edit Option B** to tweak subject lines or body text inline.

#### Step 3: Controlled Manual Dispatch & Automatic Navigation
- Click **`🚀 Send Option A`** or **`🚀 Send Option B`** to dispatch that specific variant over SMTP.
- The platform will automatically navigate to **Campaign Execution** (`live`).
- **Zero Background Auto-Sending**: Automatic background loop auto-sending is disabled — email dispatch occurs 100% under your explicit manual control.


---

## 2. Growth & Demand Generation Managers

### 📌 Campaign Strategy & Prompting Guide

OpenOutreach AI converts natural language prompts into targeted B2B prospect search strategies. You do not need to format complex Boolean queries—simply describe your objective clearly.

#### Example Campaign Prompts

##### Scenario A: Business Development Officers (BDO)
- **Campaign Name**: `BDO Financial Services Outreach`
- **Target Market**: `Find Business Development Officers (BDO) at financial services firms`
- **Country**: `US`
- **AI Derived Strategy**:
  - *Industry*: Financial Services
  - *Target Roles*: Business Development Officer (BDO), Business Development Manager, VP Business Development
  - *Keywords*: business development, BDO, financial services, corporate growth

##### Scenario B: Cybersecurity CISOs
- **Campaign Name**: `India Cybersecurity CISO Campaign`
- **Target Market**: `Find decision makers for cybersecurity software in India`
- **Country**: `IN`
- **AI Derived Strategy**:
  - *Industry*: Cybersecurity
  - *Target Roles*: CISO, Chief Information Security Officer, VP Security, Head of Cybersecurity
  - *Keywords*: cybersecurity, SIEM, SOC, threat detection

---

## 3. Sales Operations & System Administrators

### 📌 System Configuration & Administration

#### 1. Backend Environment Setup (`.env`)
Configure your root `.env` file:

```env
# Database Configuration
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/openoutreach
DB_HOST=localhost
DB_PORT=5432
DB_NAME=openoutreach
DB_USER=postgres
DB_PASSWORD=postgres

# AI Model & API Configuration
AI_API_KEY=your_openrouter_or_openai_api_key
AI_MODEL=meta-llama/llama-3.1-8b-instruct:free
VITE_API_BASE_URL=http://localhost:8000

# Lead Discovery Settings
LEAD_DISCOVERY_PROVIDER=web_search
```

#### 2. Global Meeting & Calendar Link Setup
1. Go to **Settings** (`http://localhost:5173/settings`).
2. Under **📅 Meeting & Calendar Link**, enter your default URL (e.g., `https://meet.google.com/abc-defg-hij` or `https://calendly.com/your-name`).
3. Click **Save Global Settings**. This URL will automatically populate when executing demo booking replies.

#### 3. Mailbox Connections via Gmail App Passwords
1. Go to **Mailboxes** page.
2. Click **Connect New Mailbox**.
3. Choose **Custom SMTP / Gmail App Password**.
4. Enter Host `smtp.gmail.com`, Port `587`, IMAP Host `imap.gmail.com`, IMAP Port `993`, your email address, and 16-character Gmail App Password.
5. Click **Save & Test Connection**.

---

## 4. Developers & Technical Integrators

### 📌 Architecture & Codebase Map

#### Directory Layout
```
OpenOutreach-main/
├── backend/
│   └── app/
│       ├── agents/
│       │   └── outreach_agent.py     # AI Copilot, Lead Research, Reply Agent, NBA Engine
│       ├── api/
│       │   ├── campaigns.py          # Campaign management & lead pool endpoints
│       │   ├── mailboxes.py          # SMTP/IMAP mailbox management
│       │   ├── pipeline.py           # Live Campaign Execution, IMAP sync, execute-action
│       │   └── site_config.py        # Global settings & meeting_link API
│       ├── core/
│       │   ├── config.py             # App settings loader
│       │   └── database.py           # SQLAlchemy database engine & auto-migrations
│       ├── models/
│       │   ├── campaign.py           # Campaign ORM model
│       │   ├── deal.py               # Deal state machine & EmailEvent ORM models
│       │   ├── lead.py               # Lead ORM model
│       │   ├── mailbox.py            # Mailbox, Thread, Message ORM models
│       │   └── site_config.py        # SiteConfig model (includes meeting_link column)
│       └── services/
│           ├── email_service.py      # SMTP sender, IMAP SSL reply reader, clean_reply_body
│           └── lead_discovery_service.py # Real AI Web Search discovery engine
└── frontend/
    └── src/
        ├── pages/
        │   ├── Campaigns.jsx         # Campaign wizard & strategy view
        │   ├── LiveCampaign.jsx      # Live Execution Control Room & 4-tab Inspector panel
        │   ├── Mailboxes.jsx         # Mailbox connection dashboard
        │   └── Settings.jsx          # AI Model & Global Meeting Link settings
        └── services/
            └── api.js                # Axios API bindings
```
