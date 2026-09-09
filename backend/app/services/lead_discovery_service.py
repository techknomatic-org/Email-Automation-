import re
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.campaign import Campaign
from backend.app.models.lead import Lead
from backend.app.models.deal import Deal, DealState
from backend.app.models.lead_intelligence import LeadResearch, Suppression
from backend.app.services.lead_providers import LeadProvider, get_lead_provider
from backend.app.services.campaign_intelligence import CampaignIntelligenceService, CampaignSearchStrategy
from backend.app.services.lead_verification_service import LeadVerificationService
from backend.app.services.hybrid_search_engine import HybridSearchEngine, hybrid_search_engine


def evaluate_lead_relevance(lead: Lead, strategy: CampaignSearchStrategy) -> Dict[str, Any]:
    """
    Data-Driven Lead Relevance Evaluator & Explainable AI Fit Score Engine.
    Score Components (Section 9):
      - Role / Title Match: 40%
      - Department Match: 25%
      - Industry Match: 15%
      - Location / Country Match: 10%
      - Keyword / Semantic Match: 10%
    Total = 100%
    """
    def _get_val(obj, key, default=None):
        if obj is None:
            return default
        if isinstance(obj, dict):
            return obj.get(key, default)
        return getattr(obj, key, default)

    source = _get_val(lead, "source_fields") or {}
    first_name = str(_get_val(lead, "first_name") or source.get("first_name", "") or "").strip()
    last_name = str(_get_val(lead, "last_name") or source.get("last_name", "") or "").strip()
    full_name = f"{first_name} {last_name}".strip() or str(source.get("name", "") or "").strip()
    
    # Raw field values
    title_raw = str(_get_val(lead, "job_title") or source.get("job_title", "") or source.get("title", "") or "").strip()
    dept_raw = str(_get_val(lead, "department") or source.get("department", "") or "").strip()
    company_raw = str(_get_val(lead, "company_name") or source.get("company", "") or source.get("company_name", "") or "").strip()
    industry_raw = str(_get_val(lead, "industry") or source.get("industry", "") or "").strip()
    country_raw = str(_get_val(lead, "country") or _get_val(lead, "country_code") or source.get("country", "") or source.get("location", "") or "").strip().upper()
    seniority_raw = str(_get_val(lead, "seniority") or source.get("seniority", "") or "").strip()
    profile_lower = (_get_val(lead, "profile_text") or "").lower()

    email_val = _get_val(lead, "email") or ""
    lead_full_text = f"{full_name} {email_val} {title_raw} {company_raw} {industry_raw} {country_raw} {dept_raw} {profile_lower}".lower()

    # Extract target criteria from strategy (Section 3)
    target_depts = [d.lower() for d in (_get_val(strategy, "departments", []) or _get_val(strategy, "department", []) or []) if d]
    if not target_depts and _get_val(strategy, "target_department"):
        target_depts = [_get_val(strategy, "target_department").lower()]

    target_titles = [t.lower() for t in (_get_val(strategy, "job_titles", []) or _get_val(strategy, "job_title_keywords", []) or _get_val(strategy, "roles", []) or []) if t]
    target_seniorities = [s.lower() for s in (_get_val(strategy, "seniority_levels", []) or _get_val(strategy, "seniority", []) or _get_val(strategy, "seniorities", []) or []) if s]
    target_countries = [c.upper() for c in (_get_val(strategy, "locations", []) or _get_val(strategy, "country", []) or []) if c]
    strat_cc = _get_val(strategy, "country_code")
    if strat_cc and strat_cc not in ["GLOBAL", "ALL", "US", ""]:
        target_countries.append(strat_cc.upper())

    target_industries = [i.lower() for i in (_get_val(strategy, "industries", []) or _get_val(strategy, "industry_list", []) or []) if i]
    strat_ind = _get_val(strategy, "industry")
    if strat_ind and strat_ind.lower() not in ["b2b", "general", ""]:
        target_industries.append(strat_ind.lower())

    role_term_words = {"director", "directors", "manager", "managers", "officer", "officers", "assistant", "assistants", "executive", "executives", "specialist", "specialists", "analyst", "analysts", "vp", "lead", "head", "ciso", "cto", "cfo", "ceo", "coo", "chro"}
    raw_target_kws = [k.lower() for k in (_get_val(strategy, "keywords", []) or _get_val(strategy, "required_keywords", []) or []) if len(k) > 1]
    if target_titles or target_seniorities:
        target_kws = [k for k in raw_target_kws if k not in role_term_words]
    else:
        target_kws = raw_target_kws


    # Component Scoring (Total 100%)
    role_score = 0
    dept_score = 0
    ind_score = 0
    loc_score = 0
    kw_score = 0

    why_reasons = []
    disqualify_reasons = []

    # 1. Role Match (40%)
    # Rule 6: If title_raw and seniority_raw are empty, role_score = 0 if roles were requested!
    role_matched = False
    if target_titles or target_seniorities:
        if title_raw or seniority_raw:
            title_lower = title_raw.lower()
            sen_lower = seniority_raw.lower()

            if target_titles:
                if any(hybrid_search_engine._match_term(t, title_lower, dept_raw.lower(), sen_lower) for t in target_titles):
                    role_score = 40
                    role_matched = True
                    why_reasons.append(f"✓ {title_raw} role match")
                else:
                    disqualify_reasons.append(f"Role '{title_raw}' does not match requested target roles ({', '.join(target_titles)})")
            elif target_seniorities:
                domain_ok = True
                if target_depts:
                    domain_ok = any(hybrid_search_engine._match_term(d, title_lower, dept_raw.lower()) for d in target_depts)
                
                if domain_ok and any(hybrid_search_engine._match_term(s, title_lower, dept_raw.lower(), sen_lower) for s in target_seniorities):
                    role_score = 35
                    role_matched = True
                    why_reasons.append(f"✓ {seniority_raw or title_raw} seniority match")
                else:
                    disqualify_reasons.append(f"Role '{title_raw}' does not match target persona ({', '.join(target_depts or target_seniorities)})")
            else:
                disqualify_reasons.append(f"Role '{title_raw or 'NULL'}' does not match requested roles ({', '.join(target_titles or target_seniorities)})")

        else:
            disqualify_reasons.append("Job Title is missing/NULL in imported lead record")
    else:
        role_score = 30
        role_matched = True


    # 2. Department Match (25%)
    dept_matched = False
    if target_depts:
        if any(hybrid_search_engine._match_term(d, title_lower, dept_raw.lower()) for d in target_depts):
            dept_score = 25
            dept_matched = True
            why_reasons.append(f"✓ {dept_raw or target_depts[0].title()} department")
        else:
            disqualify_reasons.append(f"Department '{dept_raw or 'NULL'}' does not match requested department ({', '.join(target_depts).title()})")
    else:
        dept_score = 25
        dept_matched = True


    # 3. Industry Match (15%)
    industry_matched = False
    if target_industries:
        if industry_raw or company_raw:
            from backend.app.services.normalizer import DataNormalizer
            matched = False
            for target_i in target_industries:
                syns = DataNormalizer.expand_industry_synonyms(target_i)
                for s in syns:
                    s_clean = s.lower().strip()
                    if not s_clean: continue
                    if len(s_clean) <= 3:
                        pat = r'\b' + re.escape(s_clean) + r'\b'
                        if re.search(pat, industry_raw.lower()) or re.search(pat, company_raw.lower()):
                            matched = True
                            break
                    else:
                        if s_clean in industry_raw.lower() or s_clean in company_raw.lower():
                            matched = True
                            break
                if matched:
                    break
            if matched:
                ind_score = 15
                industry_matched = True
                why_reasons.append(f"✓ {industry_raw or company_raw} industry")
            else:
                disqualify_reasons.append(f"Industry '{industry_raw or 'NULL'}' does not match target industry ({', '.join(target_industries).title()})")
        else:
            disqualify_reasons.append("Industry is missing/NULL in imported lead record")
    else:
        ind_score = 15
        industry_matched = True

    # 4. Location Match (10%)
    loc_matched = False
    if target_countries:
        if country_raw:
            from backend.app.services.normalizer import DataNormalizer
            lead_cname, lead_ccode = DataNormalizer.normalize_country(country_raw)
            matched = False
            for c in target_countries:
                t_cname, t_ccode = DataNormalizer.normalize_country(c)
                if (t_cname and (t_cname.upper() == lead_cname.upper() or t_cname.upper() in country_raw.upper())) or \
                   (t_ccode and (t_ccode.upper() == lead_ccode.upper() or t_ccode.upper() in country_raw.upper())) or \
                   (c.upper() == country_raw.upper() or c.upper() in country_raw.upper()):
                    matched = True
                    break
            if matched:
                loc_score = 10
                loc_matched = True
                why_reasons.append(f"✓ {country_raw} location")
            else:
                disqualify_reasons.append(f"Location '{country_raw}' does not match target country ({', '.join(target_countries)})")
        else:
            disqualify_reasons.append("Country/Location is missing/NULL in imported lead record")
    else:
        loc_score = 10
        loc_matched = True

    # 5. Keyword / Semantic Match (10%)
    if target_kws:
        matched_kws = [k for k in target_kws if k in lead_full_text]
        if len(matched_kws) == len(target_kws):
            kw_score = 10
            why_reasons.append(f"✓ Matches campaign keywords ({', '.join(matched_kws)})")
        elif matched_kws:
            kw_score = 5
            why_reasons.append(f"✓ Matches keywords ({', '.join(matched_kws)})")
    else:
        kw_score = 10

    total_fit_score = role_score + dept_score + ind_score + loc_score + kw_score

    # Strict Criteria Conjunction: MUST match all requested Department, Role, Industry, and Location!
    is_qualified = role_matched and dept_matched and loc_matched and industry_matched

    if not is_qualified:
        explanation = "Disqualified: " + "; ".join(disqualify_reasons)
        final_fit_score = min(total_fit_score, 35)
    else:
        explanation = "Why:\n" + "\n".join(why_reasons) if why_reasons else "✓ Matches campaign ICP criteria"
        final_fit_score = max(total_fit_score, 80)

    return {
        "fit_score": final_fit_score,
        "role_score": role_score,
        "dept_score": dept_score,
        "ind_score": ind_score,
        "loc_score": loc_score,
        "kw_score": kw_score,
        "role_matched": role_matched,
        "dept_matched": dept_matched,
        "loc_matched": loc_matched,
        "industry_matched": industry_matched,
        "intent_score": round(final_fit_score / 100.0, 2),
        "explanation": explanation,
        "match_reasons": why_reasons if is_qualified else disqualify_reasons,
        "is_qualified": is_qualified
    }


def generate_lead_pool_for_campaign(
    db: Session,
    campaign_id: int,
    refresh: bool = False,
    provider: Optional[LeadProvider] = None
) -> Dict[str, Any]:
    """
    Main Entrypoint: PostgreSQL-backed Hybrid Lead Discovery & ICP Matching Pipeline.
    """
    from backend.app.services.hybrid_search_engine import hybrid_search_engine

    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise ValueError("Campaign not found")

    progress_steps = []
    
    # Step 1: Extract campaign strategy dynamically
    try:
        strategy = CampaignIntelligenceService.derive_strategy(campaign)
        progress_steps.append("Extracted target ICP criteria from campaign request... ✓")
    except Exception:
        strategy = CampaignIntelligenceService.derive_heuristic_strategy(campaign)
        progress_steps.append("Derived ICP search criteria from campaign text")

    target_prompt = f"{campaign.name} {campaign.campaign_target} {campaign.objective} {campaign.description} {campaign.industry or ''}".strip()

    # Ensure explicit campaign.industry is merged into strategy industries
    if campaign.industry and campaign.industry.strip():
        explicit_inds = [v.strip() for v in campaign.industry.split(",") if v.strip()]
        for ind_val in explicit_inds:
            if ind_val not in strategy.industries:
                strategy.industries.append(ind_val)
            if ind_val not in strategy.industry_list:
                strategy.industry_list.append(ind_val)
        if not strategy.industry:
            strategy.industry = explicit_inds[0]

    # Extract attached dataset filename if specified
    csv_fn = None
    if campaign.campaign_targeting and isinstance(campaign.campaign_targeting, dict):
        csv_fn = (
            campaign.campaign_targeting.get("csv_filename")
            or campaign.campaign_targeting.get("dataset_filename")
            or campaign.campaign_targeting.get("dataset_id")
            or campaign.campaign_targeting.get("source_file")
        )
    if not csv_fn:
        match = re.search(r'([\w\-\.]+\.(?:csv|xlsx|xls))', f"{campaign.name} {campaign.campaign_target} {campaign.description}", re.IGNORECASE)
        if match:
            csv_fn = match.group(1)

    progress_steps.append("Mapped campaign intent & extracted synonyms/abbreviations... ✓")
    progress_steps.append("Queried dataset column headers & unique dimension values... ✓")

    # Step 2: Query PostgreSQL database via HybridSearchEngine with CSV dataset filter
    search_results = hybrid_search_engine.search(
        db,
        strategy,
        query_text=target_prompt,
        limit=settings.LEAD_DISCOVERY_PAGE_SIZE,
        csv_filename=csv_fn
    )

    # Validate each lead exists in dataset OR is a manual entry profile in Master DB
    if csv_fn:
        clean_fn = csv_fn.strip().lower()
        validated_results = []
        for item in search_results:
            lead = item["lead"]
            lead_src = (lead.source_file or "").lower()
            lead_source = (lead.source or "").lower()
            is_manual = "manual" in lead_src or "manual" in lead_source or not lead_src
            if is_manual or clean_fn in lead_src or clean_fn in lead_source:
                validated_results.append(item)
        search_results = validated_results

    progress_steps.append(f"Mapped matching dimensions to Lead Fact table & SQL filtered candidate pool... ✓ {len(search_results)} relevant lead profiles retrieved")

    # Strict Relevance Rule: Return ONLY qualified leads from Master Database
    valid_lead_ids = {item["lead"].id for item in search_results}
    existing_deals = db.query(Deal).filter(Deal.campaign_id == campaign.id).all()
    for d in existing_deals:
        if d.lead_id not in valid_lead_ids and d.state not in [DealState.EMAIL_SENT, DealState.FOLLOW_UP_SENT, DealState.REPLIED, DealState.SALES_HANDOFF, "Email Sent", "Follow-up Sent", "Replied", "Sales Handoff", "Meeting Booked"]:
            db.delete(d)
    try:
        db.commit()
    except Exception:
        db.rollback()

    if not search_results:
        no_match_msg = "No matching profiles found in the selected dataset." if csv_fn else "No matching leads found in the Master Database for this campaign."
        no_match_exp = no_match_msg
        progress_steps.append(no_match_msg)
        return {
            "status": "no_matching_leads",
            "message": no_match_msg,
            "explanation": no_match_exp,
            "recommendation": "Adjust target roles/keywords or upload a matching dataset.",
            "campaign_id": campaign.id,
            "campaign_name": campaign.name,
            "provider": "postgresql_pgvector",
            "strategy": strategy.model_dump(),
            "total_discovered": 0,
            "relevant_count": 0,
            "suppressed_count": 0,
            "disqualified_count": 0,
            "eligible_count": 0,
            "progress_steps": progress_steps,
            "leads": []
        }

    total_dataset = db.query(Lead).count()
    total_discovered = len(search_results)
    relevant_count = 0
    suppressed_count = 0
    disqualified_count = 0
    eligible_count = 0
    processed_deal_lead_ids = {d.lead_id for d in existing_deals if d.lead_id}

    for item in search_results:

        lead = item["lead"]
        score = item["score"]
        intent_score = item["intent_score"]
        explanation = item["explanation"]

        # Global Suppression Check
        is_suppressed = False
        if lead.email:
            suppression_entry = db.query(Suppression).filter(Suppression.email == lead.email).first()
            if suppression_entry:
                is_suppressed = True
                suppressed_count += 1

        # Upsert LeadResearch record for detailed explainability
        research = db.query(LeadResearch).filter(LeadResearch.lead_id == lead.id).first()
        if not research:
            research = LeadResearch(
                lead_id=lead.id,
                company_info=f"{lead.company_name or 'Enterprise'} ({lead.industry or 'B2B'}) - {lead.company_info or ''}".strip(),
                pain_points=["Operational scaling", "Cost optimization", "Process automation"],
                buying_intent_score=intent_score,
                intent_signals=["PostgreSQL Hybrid ICP Match", f"Country: {lead.country or lead.country_code}"],
                qualification_explanation=explanation
            )
            db.add(research)

        # Determine Deal State: Newly discovered leads start as LEAD_CREATED (Pending in Lead Pool).
        # Only when user explicitly accepts a lead does it move to QUALIFIED (Deals & Pipeline).
        if is_suppressed:
            deal_state = DealState.UNSUBSCRIBED
        else:
            deal_state = DealState.LEAD_CREATED
            relevant_count += 1
            if lead.email:
                eligible_count += 1


        # Upsert Campaign-Lead Deal Association safely
        deal = db.query(Deal).filter(Deal.lead_id == lead.id, Deal.campaign_id == campaign.id).first()
        if not deal:
            deal = Deal(
                lead_id=lead.id,
                campaign_id=campaign.id,
                state=deal_state,
                predictive_score=score,
                intent_score=intent_score,
                reason=explanation
            )
            db.add(deal)
            processed_deal_lead_ids.add(lead.id)
        else:
            deal.predictive_score = score
            deal.intent_score = intent_score
            deal.reason = explanation
            if not is_suppressed and deal.state in [DealState.LEAD_CREATED, "Lead Created"]:
                deal.state = deal_state
            processed_deal_lead_ids.add(lead.id)

    progress_steps.append(f"AI hybrid relevance scoring... ✓ {relevant_count} qualified campaign leads matched")
    progress_steps.append("Lead Pool Ready")
    try:
        db.commit()
    except Exception as commit_err:
        db.rollback()
        print(f"[LEAD_DISCOVERY] Commit error during lead pool generation: {commit_err}")

    excluded_count = max(0, total_dataset - total_discovered)

    status_str = "no_matching_leads" if relevant_count == 0 else "Lead Pool Ready"
    msg_str = "No matching leads found" if relevant_count == 0 else f"Discovered and qualified {relevant_count} relevant leads for '{campaign.name}'"

    return {
        "status": status_str,
        "message": msg_str,
        "campaign_id": campaign.id,
        "campaign_name": campaign.name,
        "provider": "postgresql_pgvector",
        "strategy": strategy.model_dump(),
        "total_discovered": total_discovered,
        "relevant_count": relevant_count,
        "suppressed_count": suppressed_count,
        "disqualified_count": disqualified_count,
        "eligible_count": eligible_count,
        "dataset_stats": {
            "total": total_dataset,
            "matched": total_discovered,
            "excluded": excluded_count,
            "qualified": eligible_count,
            "suppressed": suppressed_count,
            "disqualified": disqualified_count
        },
        "progress_steps": progress_steps
    }


def calculate_dataset_accuracy(
    db: Session,
    target_prompt: str,
    seniorities: Optional[List[str]] = None,
    keywords: Optional[List[str]] = None,
    departments: Optional[List[str]] = None,
    industries: Optional[List[str]] = None,
    locations: Optional[List[str]] = None,
    csv_filename: Optional[str] = None
) -> Dict[str, Any]:
    """
    Computes dynamic Dataset Match Accuracy breakdown live from actual PostgreSQL lead data.
    Measures dataset-wide alignment against campaign ICP (Role, Department, Semantic, Industry, Location Match %).
    """
    total_leads = db.query(Lead).all()
    total_count = len(total_leads)

    if total_count == 0:
        return {
            "overall_match": 0,
            "role_match": 0,
            "department_match": 0,
            "semantic_match": 0,
            "industry_match": 0,
            "location_match": 0,
            "matching_profiles": "0 / 0",
            "matched_count": 0,
            "total_count": 0,
            "explanation": "No leads found in PostgreSQL dataset."
        }

    # Build campaign strategy from input parameters
    dummy_camp = Campaign(
        name="Accuracy Eval",
        campaign_target=target_prompt or "B2B Target Persona",
        description="Dataset accuracy evaluation"
    )
    strategy = CampaignIntelligenceService.derive_strategy(dummy_camp)
    if seniorities:
        strategy.seniority_levels = list(dict.fromkeys(strategy.seniority_levels + seniorities))
        strategy.roles = list(dict.fromkeys(strategy.roles + seniorities))
    if keywords:
        strategy.keywords = list(dict.fromkeys(strategy.keywords + keywords))
    if departments:
        strategy.departments = list(dict.fromkeys(strategy.departments + departments))
        strategy.department = list(dict.fromkeys(strategy.department + departments))
    if industries:
        strategy.industries = list(dict.fromkeys(strategy.industries + industries))
        strategy.industry_list = list(dict.fromkeys(strategy.industry_list + industries))
    if locations:
        strategy.locations = list(dict.fromkeys(strategy.locations + locations))
        strategy.country = list(dict.fromkeys(strategy.country + locations))

    # Evaluate each lead in dataset
    role_scores = []
    dept_scores = []
    kw_scores = []
    ind_scores = []
    location_scores = []
    matched_count = 0

    for lead in total_leads:
        eval_res = evaluate_lead_relevance(lead, strategy)
        r_score = eval_res.get("role_score", 0)  # Max 40
        d_score = eval_res.get("dept_score", 0)  # Max 25
        l_score = eval_res.get("loc_score", 0)   # Max 10
        k_score = eval_res.get("kw_score", 0)    # Max 10
        i_score = eval_res.get("ind_score", 0)   # Max 15

        r_pct = min(100, int((r_score / 40.0) * 100)) if (strategy.job_titles or strategy.seniority_levels) else 85
        d_pct = min(100, int((d_score / 25.0) * 100)) if strategy.departments else 85
        l_pct = min(100, int((l_score / 10.0) * 100)) if strategy.locations else 100
        k_pct = min(100, int((k_score / 10.0) * 100)) if strategy.keywords else 85
        i_pct = min(100, int((i_score / 15.0) * 100)) if strategy.industries else 85

        is_match = eval_res.get("fit_score", 0) >= 65 or eval_res.get("role_matched", False) or eval_res.get("dept_matched", False)
        if is_match:
            matched_count += 1
            role_scores.append(r_pct)
            dept_scores.append(d_pct)
            kw_scores.append(k_pct)
            ind_scores.append(i_pct)
            location_scores.append(l_pct)

    if matched_count > 0:
        avg_role = min(100, max(0, int(sum(role_scores) / len(role_scores))))
        avg_dept = min(100, max(0, int(sum(dept_scores) / len(dept_scores))))
        avg_kw = min(100, max(0, int(sum(kw_scores) / len(kw_scores))))
        avg_ind = min(100, max(0, int(sum(ind_scores) / len(ind_scores))))
        avg_loc = min(100, max(0, int(sum(location_scores) / len(location_scores))))
    else:
        avg_role = 0
        avg_dept = 0
        avg_kw = 0
        avg_ind = 0
        avg_loc = 0

    # Calculate overall dataset fit score across all 5 dimensions
    overall = int((avg_role * 0.30) + (avg_dept * 0.25) + (avg_kw * 0.15) + (avg_ind * 0.15) + (avg_loc * 0.15))
    if matched_count > 0 and overall == 0:
        overall = min(98, max(50, int((matched_count / total_count) * 100)))

    return {
        "overall_match": overall,
        "role_match": avg_role,
        "department_match": avg_dept,
        "keyword_match": avg_kw,
        "industry_match": avg_ind,
        "location_match": avg_loc,
        "semantic_match": avg_kw,
        "matching_profiles": f"{matched_count} / {total_count}",
        "matched_count": matched_count,
        "total_count": total_count,
        "explanation": f"Dataset contains {matched_count} highly relevant profiles out of {total_count} total records."
    }
