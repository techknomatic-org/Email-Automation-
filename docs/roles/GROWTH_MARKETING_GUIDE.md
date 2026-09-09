# OpenOutreach AI — Growth & Demand Gen Manager Guide

**Target Audience**: Growth Marketers, Demand Generation Managers, Outbound Campaign Strategists.

---

## 🎯 Role Overview

As a Growth or Demand Gen Manager, you own campaign strategy creation, audience targeting prompt engineering, ICP alignment, lead pool freshness, global meeting link configuration, and overall outbound conversion analytics.

---

## 🚀 Creating Campaigns with ChatGPT-Style AI Intelligence

OpenOutreach AI uses a ChatGPT-style intelligence layer to convert natural language prompts into structured search strategies.

### 1. Creating a New Campaign with AI Natural Language Prompt Parsing
1. Open the UI at `http://localhost:5173` and sign in with your Growth account credentials.
2. Click **Campaigns** -> **New Campaign** (or launch the **AI Campaign Wizard**).
3. Provide details in plain natural language:
   - **Campaign Name**: Clear, descriptive title.
   - **Target Market / Persona**: Describe your target in plain natural language with full support for typos and abbreviations (e.g. `"customer support mangers in dubai in bfsi indusry"`, `"director from japan in oprations dept"`, `"pbi finance director in india"`).
   - **AI Prompt Parsing**: The engine automatically autocorrects spelling mistakes, expands acronyms (`PBI → Power BI`, `HR → Human Resources`, `BDO → Business Development`, `CS → Customer Support`), extracts global countries/cities (`Japan`, `Dubai`, `India`, `Germany`, `France`, `China`), and resolves title inversions (`VP of HR` ↔ `HR VP`).
   - **Strict Multi-Attribute Disqualification**: Candidate profiles must strictly match the target location, department, and industry. Mismatches receive a 0 score and are completely excluded from the campaign lead pool.
   - **Country**: Optional manual override or auto-extracted by AI.

### 2. Configuring Global Meeting / Demo Booking Links
1. Navigate to **Settings** (`http://localhost:5173/settings`).
2. Under **📅 Meeting & Calendar Link**, enter your team's Google Meet, Calendly, or Zoom booking URL.
3. Click **Save Global Settings**.
4. When AI classifies a prospect reply as positive or meeting request, this URL will automatically populate in demo invitation reply drafts.

### 3. Inspecting the AI Search Strategy Breakdown
When you trigger **Generate / Refresh Lead Pool** on the **Leads** tab, the AI derives a structured search strategy:

```
[ChatGPT AI Campaign Intelligence Strategy]
Target Roles: Operations Director, Director of Operations
Inferred Department: Operations
Target Seniority: Director
Target Location: Japan (JP)
Strict Disqualification: Candidates without matching location/department are strictly excluded
AI Rationale: Strategy parsed from natural language prompt with automatic typo resolution and country grounding...
```

---

## 📊 Campaign Performance & Lead Pool Metrics

In the **Leads** page, monitor the metrics banner:
- **Total Discovered**: Candidate prospects fetched via Real AI Web Search & OpenRouter Candidate Grounding.
- **Relevant / Qualified**: Prospects meeting ICP criteria with verified business emails.
- **Suppressed**: Prospects blocked due to global opt-out list.
- **Disqualified**: Prospects failing ICP fit rules.
- **Eligible Deals**: Qualified leads ready for active email sequences.

To refresh or update your targeting criteria after editing a campaign, click **Regenerate Lead Pool**.

---

## ⏱️ Configuring Campaign Sequence Cadence Timers

1. Open **Campaign Execution & Live Process** (`http://localhost:5173/live`).
2. Locate the **Sequence Timer** control widget in the top header card.
3. Input your desired numeric value and choose your time unit:
   - **`sec`** (Seconds)
   - **`min`** (Minutes)
   - **`hr`** (Hours)
   - **`day`** (Days)
4. Click **Set Timer** to apply changes instantly.
5. Pending deals for the selected campaign will dynamically update their follow-up countdown timers to match your configured interval.
