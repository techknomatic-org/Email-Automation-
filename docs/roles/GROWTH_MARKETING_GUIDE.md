# OpenOutreach AI — Growth & Demand Gen Manager Guide

**Target Audience**: Growth Marketers, Demand Generation Managers, Outbound Campaign Strategists.

---

## 🎯 Role Overview

As a Growth or Demand Gen Manager, you own campaign strategy creation, audience targeting prompt engineering, ICP alignment, lead pool freshness, global meeting link configuration, and overall outbound conversion analytics.

---

## 🚀 Creating Campaigns with ChatGPT-Style AI Intelligence

OpenOutreach AI uses a ChatGPT-style intelligence layer to convert natural language prompts into structured search strategies.

### 1. Creating a New Campaign with Strict Keyword Conjunction
1. Open the UI at `http://localhost:5173` and sign in with your Growth account credentials.
2. Click **Campaigns** -> **New Campaign** (or launch the **AI Campaign Wizard**).
3. Provide details:
   - **Campaign Name**: Clear, descriptive title.
   - **Target Market / Persona**: Describe your target in plain natural language (e.g. *"Find Business Development Officers at financial services companies"*).
   - **Objective**: Define the call to action (e.g. *"Book product demo calls for B2B analytics platform"*).
   - **Product Docs**: Briefly describe your product or paste documentation.
   - **Search Keywords (AND Condition)**: Add specific domain keywords (e.g. `["SaaS", "Director", "Fintech"]`). The engine evaluates these using a **strict `AND` condition** — every discovered prospect profile must match all specified keywords across job title, department, industry, and bio text.
   - **Country**: Specify 2-letter country code (e.g. `US`, `IN`, `DE`, `UK`).

### 2. Configuring Global Meeting / Demo Booking Links
1. Navigate to **Settings** (`http://localhost:5173/settings`).
2. Under **📅 Meeting & Calendar Link**, enter your team's Google Meet, Calendly, or Zoom booking URL.
3. Click **Save Global Settings**.
4. When AI classifies a prospect reply as positive or meeting request, this URL will automatically populate in demo invitation reply drafts.

### 3. Inspecting the AI Search Strategy Breakdown
When you trigger **Generate / Refresh Lead Pool** on the **Leads** tab, the AI derives a structured search strategy:

```
[ChatGPT AI Campaign Intelligence Strategy]
Target Roles: Business Development Officer (BDO), Business Development Manager, VP Business Development
Inferred Sector: Financial Services
Target Keywords (AND Condition): business development, BDO, growth, financial services
Target Location: US
AI Rationale: Strategy derived for targeting BDO decision makers with strict keyword conjunction...
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
