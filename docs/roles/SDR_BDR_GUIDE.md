# OpenOutreach AI — SDR & BDR User Guide

**Target Audience**: Sales Development Representatives (SDRs), Business Development Representatives (BDRs), Account Executives (AEs).

---

## 🎯 Role Overview

As an SDR or BDR using OpenOutreach AI, your goal is to efficiently review qualified prospects, leverage AI intelligence to understand prospect pain points, personalize and send outbound emails via connected Gmail mailboxes, inspect deal threads in real time, and execute context-aware AI recommended actions.

---

## 📋 Step-by-Step Daily Workflow

### 1. Signing In & Navigating to Campaigns
1. Open OpenOutreach AI at `http://localhost:5173`.
2. Sign in with your work email and password, or click **⚡ One-Click Quick Demo Sign In** (`admin@openoutreach.ai` / `Admin123!`).
3. View your active profile and role in the sidebar. Click **Leads** in the side navigation bar.
4. Select your assigned campaign from the **Campaign Context** dropdown at the top right.
5. The main table will display real B2B prospects discovered by Real AI Web Search & strict keyword matching for that campaign.

### 2. Understanding Prospect Table Indicators
- **Source**: Displays `Real AI Web Search` (live candidate grounding).
- **Prospect Info**: Full Name, Job Title, Company Name, Industry.
- **Email & Verification**: Verified business email with verification status.
- **AI Fit Score**: Green score (e.g. `95%`) indicating high alignment with campaign ICP target.
- **Status**:
  - `Qualified`: Eligible for outreach.
  - `Suppressed`: Email opted out or on global suppression list (cannot email).
  - `Disqualified`: Target failed ICP criteria.

### 3. Reviewing Deals, Dual Email Variants & AI Follow-Up Generation
1. In the **Leads** pool, select leads and click **✓ Add to Deals & Pipeline**. OpenOutreach automatically navigates to **Deals & Pipeline**.
2. Click **👁️ Preview** on any deal card.
3. **Compare Option A & Option B**: Option A (Direct Value Pitch) and Option B (High Curiosity Pitch) are rendered stacked vertically so you can compare both versions side by side.
4. **Edit Recipient Email**: Click **`✏️ Edit Email`** in the header if you need to dispatch the email to a custom address (e.g. `another.person@company.com`).
5. **Inspect Conversation Thread & Header Tabs**:
   - The top header of the composer displays **`💬 Previous Emails (N)`** if past messages exist, or **`💬 No Previously Sent Mail`** if `0` messages exist.
   - Clicking **`💬 No Previously Sent Mail`** displays a helpful empty state card with a 1-click **`📝 Open Email Composer`** button.
   - If past emails exist in the thread, open the thread tab and click **`🔄 Generate AI Follow-Up Mail`**. The AI reads past outbound pitches and prospect responses, auto-crafts a contextual follow-up, and automatically switches back to the **`📝 Composer`** tab with the follow-up draft populated!
6. **Send Selected Variant**: Click **`🚀 Send Option A`** or **`🚀 Send Option B`** to dispatch that email format over SMTP. The system will automatically navigate to **Campaign Execution**.

### 4. Live Campaign Execution & 4-Tab Inspector Panel
1. Open **Campaign Execution** at `http://localhost:5173/live-campaign`.
2. Click any prospect row to open the 4-Tab Inspector Drawer:
   - **Overview**: Prospect 360° summary and state.
   - **Email Thread**: View sent emails and incoming prospect replies. Quoted `>` lines are automatically stripped so prospect text is highlighted.
   - **AI Decision**: Real-time AI classification (`Interested`, `Meeting Request`, `Not Interested`, `Unsubscribe`) and recommended next action.
   - **Timeline**: Chronological audit trail showing local send times and event badges (📤 Sent, 👁️ Opened, 📥 Replied, 🤖 AI Decision, 🚫 Unsubscribed).

### 5. Manual Execution & Zero Unintended Auto-Sending
- Sending and replies occur strictly under your manual control.
- Under **AI Decision**:
  - **For Demo Requests / Interested**: Review your meeting link (Google Meet, Calendly, Zoom) and click **🚀 Send Reply & Schedule Demo**.
  - **For Continue Sequence**: Click **🚀 Execute Next Step: Send Follow-up Email**.
  - **For Unsubscribe / Negative Reply**: Click **🛑 Stop Sequence & Suppress Lead**.


---

## 💡 Best Practices for SDRs

- **Always inspect the Email Thread** to read the prospect's exact response before taking action.
- **Use custom meeting links**: You can customize your meeting URL right inside the AI Decision panel before clicking execute.
- **Respect suppressions**: Suppressed leads are automatically blocked to protect your sender domain reputation.
