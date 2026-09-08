# Implementation Plan: CSV Data Upload & AI Campaign Copilot Integration

## Overview
This design plan outlines the architecture for adding CSV file upload capabilities to the OpenOutreach AI portal, organizing input CSV files under a dedicated project folder (`data/input_csv/`), and connecting CSV data directly into the **AI Campaign Copilot Wizard** as target input and referral context.

---

## 1. Project Directory Structure
Create a dedicated input data folder in the project root:
```
data/
└── input_csv/
    ├── sample_b2b_prospects.csv     # Pre-seeded B2B referral dataset
    └── README.md                    # Specifications for target CSV formats
```

### Supported CSV Schema
CSV files can contain arbitrary B2B contact lists or target ICP data with key fields:
- `Name` / `First Name` / `Last Name`
- `Job Title` / `Role` / `Seniority`
- `Company` / `Domain` / `Company Description`
- `Industry` / `Sector`
- `Location` / `Country`
- `Email` / `Phone`
- `Notes` / `Pain Points`

---

## 2. Backend Architecture & API Design

### A. New API Router: `backend/app/api/csv_upload.py`
Endpoints for file upload, retrieval, and CSV parsing:
1. `POST /api/v1/csv/upload`
   - Accepts `multipart/form-data` file upload.
   - Saves CSV file into `data/input_csv/`.
   - Parses columns, sample rows, total row count, detected roles, and top industry keywords.
   - Returns structured metadata for frontend preview and Copilot referral.
2. `GET /api/v1/csv/files`
   - Scans `data/input_csv/` and returns list of available CSV files with file size, row count, and creation timestamp.
3. `GET /api/v1/csv/preview/{filename}`
   - Returns header columns and top 10 sample rows for frontend display.

### B. AI Copilot Integration: `backend/app/api/ai_copilot.py` & `outreach_agent.py`
Update `CopilotPlanRequest` to accept optional CSV referral context:
```python
class CopilotPlanRequest(BaseModel):
    product_docs: str
    target_prompt: str
    csv_filename: Optional[str] = None
    csv_context: Optional[Dict[str, Any]] = None
```
When `csv_context` or `csv_filename` is supplied:
- `CampaignCopilotAgent` extracts real personas, target industries, and keywords directly from the CSV columns and sample data.
- Auto-generates campaign name, target ICP, seniorities, and search keywords matching the CSV profile distribution.

---

## 3. Frontend Architecture (React UI)
 
### A. Upload CSV Button & Modal / Dropzone
- **Locations**:
  - `CampaignWizard.jsx` (Step 1: Product & Target Goal)
  - `Leads.jsx` (Header action bar next to "Find Leads")
  - `ImportDatasetModal.jsx` / `ImportSummaryModal.jsx`
- **Features**:
  - Drag-and-drop file upload zone.
  - Dropdown selector to pick pre-existing CSV files from `data/input_csv/`.
  - Ingestion Summary Modal with smooth vertical scrollbar (`max-h-[380px] overflow-y-auto custom-scrollbar`).
  - Real-time Ingestion Metrics Breakdown:
    - 📊 **Total Processed Rows**
    - ✅ **Successfully Created / Enriched Leads**
    - ⚠️ **Skipped / Invalid Records** (with clear reason tags: missing email, duplicate, invalid formatting)
    - 🎯 **Top Job Titles Detected** (e.g. BDO, CFO, CISO, Founder)
    - 🌐 **Target Countries & Industries Detected**

### B. AI Campaign Copilot Wizard Integration (`CampaignWizard.jsx`)
- Step 1: Add **"Attach Reference CSV / Target Lead List (Optional)"**.
- Selecting a CSV automatically populates or enriches the Target Audience Objective text box with detected personas and industry context.
- When clicking **"Generate AI Strategy Plan"**, the CSV referral data is sent to the backend Copilot API.
- Step 2: Copilot strategy plan displays recommendations explicitly tailored to the attached CSV file.

---

## 4. Implementation Status
- [x] Backend CSV ingestion router (`backend/app/api/csv_upload.py`)
- [x] Frontend CSV Drag & Drop Zone (`CsvUploadModal.jsx`, `ImportDatasetModal.jsx`)
- [x] Ingestion Breakdown Modal with Vertical Scrollbar & Exact Processed / Skipped Counts
- [x] Direct Lead Store Injection (`POST /api/v1/leads/upload-csv`)
- [x] Copilot AI Strategy generation with CSV context (`backend/app/api/ai_copilot.py`)
