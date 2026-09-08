import datetime
from sqlalchemy.orm import Session
from backend.app.models.site_config import SiteConfig
from backend.app.models.campaign import Campaign, Keyword, QueryNode
from backend.app.models.lead import Lead
from backend.app.models.deal import Deal
from backend.app.models.mailbox import Mailbox, Thread, Message
from backend.app.models.knowledge import KnowledgeDocument, KnowledgeChunk
from backend.app.models.sequence import Sequence, SequenceStep, ABExperiment, ABVariant
from backend.app.models.lead_intelligence import LeadResearch, NextBestAction, Suppression

def seed_all_demo_data(db: Session):
    # 1. SiteConfig
    config = db.query(SiteConfig).first()
    if not config:
        config = SiteConfig(
            ai_model="openai:gpt-4o-mini",
            llm_api_key="demo-key-12345",
            country_code="US"
        )
        db.add(config)
        db.commit()

    # 2. Mailboxes
    if db.query(Mailbox).count() == 0:
        box1 = Mailbox(
            username="alex.marketing@openoutreach.ai",
            from_address="Alex Morgan <alex.marketing@openoutreach.ai>",
            password="app-password-demo",
            host="smtp.gmail.com",
            port=587,
            imap_host="imap.gmail.com",
            imap_port=993,
            signature="Best regards,\nAlex Morgan\nHead of Outreach @ OpenOutreach",
            daily_limit=180,
            sent_today=24
        )
        box2 = Mailbox(
            username="sarah.sales@openoutreach.ai",
            from_address="Sarah Jenkins <sarah.sales@openoutreach.ai>",
            password="app-password-demo2",
            host="smtp.gmail.com",
            port=587,
            imap_host="imap.gmail.com",
            imap_port=993,
            signature="Cheers,\nSarah Jenkins\nSales Lead @ OpenOutreach",
            daily_limit=150,
            sent_today=12
        )
        db.add_all([box1, box2])
        db.commit()

    box1 = db.query(Mailbox).first()

    # 3. Campaigns
    if db.query(Campaign).count() == 0:
        c1 = Campaign(
            name="Q3 B2B SaaS Founders Outreach",
            description="Targeting B2B SaaS founders with 10-50 employees for sales automation",
            objective="Book 20 demo calls with VP Sales & Founders in North America",
            product_docs="OpenOutreach is an autonomous AI sales agent that automates email discovery, GPR qualification, and Mom-Test personalized outreach.",
            campaign_target="Founders, Co-Founders, CEO, VP Sales at SaaS companies",
            booking_link="https://cal.com/openoutreach/demo",
            country_code="US",
            headcount_min=10,
            headcount_max=50,
            anchor_profiles=[
                {"title": "Founder", "seniority": "Executive", "location": "San Francisco"},
                {"title": "CEO", "seniority": "Executive", "location": "New York"}
            ]
        )
        c2 = Campaign(
            name="Enterprise AI RevOps Leaders",
            description="Outreach to RevOps Directors & Enterprise Sales Tech buyers",
            objective="Introduce active learning lead qualification & automated cold emails",
            product_docs="Autonomous lead scoring, LLM intent qualification, and non-spammy personalized sequences.",
            campaign_target="VP RevOps, Director Sales Operations, Chief Commercial Officer",
            booking_link="https://cal.com/openoutreach/enterprise",
            country_code="US",
            headcount_min=51,
            headcount_max=500
        )
        db.add_all([c1, c2])
        db.commit()

    campaign = db.query(Campaign).first()

    # 4. Leads & Research
    if db.query(Lead).count() == 0:
        sample_leads = [
            {
                "url": "https://linkedin.com/in/david-miller-saas",
                "email": "david.m@cloudscale.io",
                "country": "US",
                "text": "David Miller - CEO & Founder at CloudScale. Building scalable cloud infrastructure for modern AI apps.",
                "fields": {"job_title": "CEO & Founder", "company": "CloudScale", "seniority": "Executive", "headcount": 28},
                "company_info": "CloudScale is a 28-person seed stage SaaS provider.",
                "pain_points": ["Low outbound email deliverability", "Manual lead prospecting takes 15 hours/week"],
                "score": 0.94
            },
            {
                "url": "https://linkedin.com/in/elena-rodriguez-tech",
                "email": "elena@vertexai.tech",
                "country": "US",
                "text": "Elena Rodriguez - Co-Founder & CTO at Vertex AI. Empowering developers with real-time vector search API.",
                "fields": {"job_title": "Co-Founder & CTO", "company": "Vertex AI", "seniority": "Executive", "headcount": 42},
                "company_info": "Vertex AI is a Series-A developer tools company.",
                "pain_points": ["High SDR turnover", "Low reply rates on templated outreach"],
                "score": 0.88
            },
            {
                "url": "https://linkedin.com/in/marcus-vance-sales",
                "email": "marcus.v@datapulse.co",
                "country": "US",
                "text": "Marcus Vance - VP of Sales at DataPulse. Real-time data pipeline analytics platform.",
                "fields": {"job_title": "VP of Sales", "company": "DataPulse", "seniority": "VP", "headcount": 35},
                "company_info": "DataPulse specializes in enterprise telemetry.",
                "pain_points": ["Inability to scale personalized outreach without hiring more SDRs"],
                "score": 0.91
            }
        ]

        for lead_data in sample_leads:
            lead = Lead(
                profile_url=lead_data["url"],
                email=lead_data["email"],
                country_code=lead_data["country"],
                profile_text=lead_data["text"],
                source_fields=lead_data["fields"],
                disqualified=False
            )
            db.add(lead)
            db.commit()

            research = LeadResearch(
                lead_id=lead.id,
                company_info=lead_data["company_info"],
                pain_points=lead_data["pain_points"],
                buying_intent_score=lead_data["score"],
                intent_signals=["Recent hiring for sales team", "Product Hunt launch last month"],
                qualification_explanation="Perfect fit based on employee count (20-50) and active outbound expansion."
            )
            db.add(research)

            # Create Threads & Messages & Deals
            thread = Thread(subject=f"Quick question re: {lead_data['fields']['company']}'s growth stack")
            db.add(thread)
            db.commit()

            msg1 = Message(
                mailbox_id=box1.id if box1 else 1,
                thread_id=thread.id,
                message_id=f"<msg-{lead.id}-1@openoutreach.ai>",
                direction="outbound",
                subject=thread.subject,
                body=f"Hi {lead_data['fields']['job_title'].split()[0]},\n\nNoticed {lead_data['fields']['company']} is expanding its tech stack. How are you currently qualifying cold leads before sending outreach?\n\nBest,\nAlex",
                sent_at=datetime.datetime.utcnow() - datetime.timedelta(days=2)
            )
            db.add(msg1)

            if lead_data["score"] > 0.9:
                msg2 = Message(
                    mailbox_id=box1.id if box1 else 1,
                    thread_id=thread.id,
                    message_id=f"<reply-{lead.id}-2@client.com>",
                    direction="inbound",
                    subject=f"Re: {thread.subject}",
                    body="Hey Alex, good timing actually. We are evaluating tools this quarter. What makes OpenOutreach different from Apollo/Outreach?",
                    sent_at=datetime.datetime.utcnow() - datetime.timedelta(days=1)
                )
                db.add(msg2)
                state = "EMAILED"
            else:
                state = "READY_TO_EMAIL"

            db.commit()

            deal = Deal(
                campaign_id=campaign.id if campaign else 1,
                lead_id=lead.id,
                mailbox_id=box1.id if box1 else 1,
                thread_id=thread.id,
                state=state,
                deal_score=lead_data["score"]
            )
            db.add(deal)
            db.commit()

            nba = NextBestAction(
                deal_id=deal.id,
                recommended_action="Send Mom-Test Case Study Reply",
                confidence_score=0.92,
                reasoning="Lead asked direct comparison question about deliverability and automated qualification."
            )
            db.add(nba)

    # 5. Sequences & A/B Experiments
    if db.query(Sequence).count() == 0:
        seq = Sequence(
            name="Founders Cold Opener + Value Proposition",
            campaign_id=campaign.id if campaign else 1
        )
        db.add(seq)
        db.commit()

        s1 = SequenceStep(
            sequence_id=seq.id,
            step_number=1,
            delay_days=0,
            subject_template="Quick thought on {company}'s outreach",
            body_template="Hi {first_name},\n\nSaw {company} recently launched. Are you currently handling lead qualification manually or with SDRs?"
        )
        s2 = SequenceStep(
            sequence_id=seq.id,
            step_number=2,
            delay_days=3,
            subject_template="Re: Quick thought on {company}'s outreach",
            body_template="Hi {first_name},\n\nFollowing up on my previous note. Thought you might find this case study interesting on how 10-person SaaS teams automate discovery without spamming."
        )
        db.add_all([s1, s2])
        db.commit()

        exp = ABExperiment(
            name="Subject Line Test: Direct vs Curiosity",
            campaign_id=campaign.id if campaign else 1,
            status="active"
        )
        db.add(exp)
        db.commit()

        v1 = ABVariant(
            experiment_id=exp.id,
            variant_name="Variant A (Direct)",
            subject_line="Quick question about {company}'s sales tech",
            sends=45,
            opens=28,
            replies=8
        )
        v2 = ABVariant(
            experiment_id=exp.id,
            variant_name="Variant B (Curiosity)",
            subject_line="Automated lead scoring for {company}?",
            sends=42,
            opens=31,
            replies=11
        )
        db.add_all([v1, v2])
        db.commit()

    # 6. Knowledge Documents
    if db.query(KnowledgeDocument).count() == 0:
        k1 = KnowledgeDocument(
            title="OpenOutreach Product Positioning & ICP Guide",
            category="Product Documentation",
            content="OpenOutreach is a self-hosted email-first AI sales agent. It uses Bayesian GPR + BALD active learning for lead qualification and Mom-Test personalized emailing.",
            file_type="markdown"
        )
        k2 = KnowledgeDocument(
            title="Handling Common Sales Objections",
            category="Sales Playbook",
            content="When leads ask about deliverability: OpenOutreach respects sending windows (Mon-Fri 8am-8pm), enforces per-mailbox rate limits (3.5-4.5 mins), and attaches RFC 8058 headers.",
            file_type="markdown"
        )
        db.add_all([k1, k2])
        db.commit()

        chunk1 = KnowledgeChunk(
            document_id=k1.id,
            chunk_index=0,
            chunk_text="OpenOutreach is a self-hosted email-first AI sales agent.",
            embedding=[0.01] * 384
        )
        db.add(chunk1)
        db.commit()

    print("Successfully seeded demo data across all DB tables!")
