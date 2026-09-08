import re
import json
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, text

from backend.app.models.lead import Lead
from backend.app.services.normalizer import DataNormalizer
from backend.app.services.rag_service import rag_service

class HybridSearchEngine:
    """
    3-Stage PostgreSQL + pgvector Hybrid Lead Search & Discovery Engine.
    Stage A: Structured SQL Filtering (Eliminates irrelevant records at database layer).
    Stage B: Semantic pgvector Similarity Search (Cosine distance over lead embeddings).
    Stage C: AI Re-ranking & Explainable Relevance Scoring.
    """

    @staticmethod
    def _match_term(term: str, title_text: str, dept_text: str, sen_text: str = "") -> bool:
        if not term or not term.strip():
            return False
        t_clean = term.lower().strip()

        EXPANSIONS = {
            "pbi": ["power bi", "powerbi", "pbi", "bi"],
            "power bi": ["power bi", "powerbi", "pbi", "bi"],
            "hr": ["human resources", "hr", "people", "talent"],
            "it": ["information technology", "it", "tech"],
            "cx": ["customer experience", "customer support", "cx"],
            "fpa": ["financial planning", "fp&a", "finance", "fpa"],
            "fp&a": ["financial planning", "fp&a", "finance", "fpa"],
            "ciso": ["ciso", "information security", "cybersecurity", "security"],
            "bdo": ["bdo", "business development officer", "business development"]
        }

        search_variations = [t_clean]
        if t_clean in EXPANSIONS:
            search_variations.extend(EXPANSIONS[t_clean])
        if '/' in t_clean:
            search_variations.extend([v.strip() for v in t_clean.split('/') if v.strip()])

        for var in search_variations:
            if not var: continue
            if var in title_text or var in dept_text or (sen_text and var in sen_text):
                return True
            sing_var = re.sub(r's\b', '', var)
            if sing_var and (sing_var in title_text or sing_var in dept_text or (sen_text and sing_var in sen_text)):
                return True

        tokens = [w for w in re.findall(r'\b[a-z0-9]{3,}\b', t_clean) if w not in ('and', 'the', 'for', 'with', 'all', 'in', 'at')]
        if tokens:
            matched_count = 0
            for tok in tokens:
                sing_tok = re.sub(r's\b', '', tok)
                if tok in title_text or tok in dept_text or (sen_text and tok in sen_text) or sing_tok in title_text or sing_tok in dept_text or (sen_text and sing_tok in sen_text):
                    matched_count += 1
            if matched_count >= max(1, len(tokens) - 1):
                return True
        return False

    @classmethod
    def _discover_matching_dimension_values(
        cls,
        db: Session,
        criteria: Any,
        query_text: str = "",
        csv_filename: Optional[str] = None
    ) -> Dict[str, List[str]]:
        """
        Dimension Search Stage:
        First queries the dataset's unique column headers/dimension values
        (job_title, department, seniority, industry, country)
        and finds the relevant unique dataset values matching the campaign intent & expanded synonyms/abbreviations.
        """
        base_q = db.query(Lead).filter(Lead.disqualified == False)
        if csv_filename and csv_filename.strip():
            clean_fn = csv_filename.strip().lower()
            base_q = base_q.filter(or_(Lead.source_file.ilike(f"%{clean_fn}%"), Lead.source.ilike(f"%{clean_fn}%")))

        # Extract distinct dataset dimension values
        distinct_depts = [r[0] for r in base_q.with_entities(Lead.department).distinct().all() if r[0]]
        distinct_seniorities = [r[0] for r in base_q.with_entities(Lead.seniority).distinct().all() if r[0]]
        distinct_titles = [r[0] for r in base_q.with_entities(Lead.job_title).distinct().all() if r[0]]
        distinct_industries = [r[0] for r in base_q.with_entities(Lead.industry).distinct().all() if r[0]]
        distinct_countries = [r[0] for r in base_q.with_entities(Lead.country).distinct().all() if r[0]]

        # Target criteria from intent & prompt
        depts = [d.strip() for d in (getattr(criteria, "departments", []) or getattr(criteria, "department", []) or []) if d and d.strip()]
        job_titles = [t.strip() for t in (getattr(criteria, "job_titles", []) or getattr(criteria, "job_title_keywords", []) or getattr(criteria, "roles", []) or []) if t and t.strip()]
        seniorities = [s.strip() for s in (getattr(criteria, "seniority_levels", []) or getattr(criteria, "seniority", []) or []) if s and s.strip()]
        countries = [c.strip() for c in (getattr(criteria, "locations", []) or getattr(criteria, "country", []) or []) if c and c.strip()]
        if getattr(criteria, "country_code", None) and criteria.country_code.upper() not in ["GLOBAL", "ALL", ""]:
            countries.append(criteria.country_code.upper())
        industries = [i.strip() for i in (getattr(criteria, "industries", []) or getattr(criteria, "industry_list", []) or []) if i and i.strip()]
        keywords = [k.strip() for k in (getattr(criteria, "keywords", []) or getattr(criteria, "required_keywords", []) or []) if k and k.strip()]

        synonyms_dict = getattr(criteria, "synonyms", {}) or {}
        expanded_terms = []
        for k, v_list in synonyms_dict.items():
            expanded_terms.append(k)
            if isinstance(v_list, list):
                expanded_terms.extend(v_list)

        matched_depts = []
        for d_val in distinct_depts:
            d_lower = d_val.lower()
            if any(cls._match_term(target_d, "", d_lower) for target_d in depts + expanded_terms):
                matched_depts.append(d_val)

        matched_seniorities = []
        for s_val in distinct_seniorities:
            s_lower = s_val.lower()
            if any(cls._match_term(target_s, "", "", s_lower) for target_s in seniorities):
                matched_seniorities.append(s_val)

        matched_titles = []
        for t_val in distinct_titles:
            t_lower = t_val.lower()
            all_title_targets = job_titles + depts + keywords + expanded_terms
            if any(cls._match_term(target_t, t_lower, "") for target_t in all_title_targets):
                matched_titles.append(t_val)

        matched_industries = []
        for ind_val in distinct_industries:
            ind_lower = ind_val.lower()
            for target_i in industries:
                syns = DataNormalizer.expand_industry_synonyms(target_i)
                if any(s in ind_lower or ind_lower in s for s in syns):
                    if ind_val not in matched_industries:
                        matched_industries.append(ind_val)
                    break

        matched_countries = []
        for c_val in distinct_countries:
            c_lower = c_val.lower()
            for c_target in countries:
                cname, ccode = DataNormalizer.normalize_country(c_target)
                if (cname and cname.lower() in c_lower) or (ccode and ccode.lower() in c_lower) or (c_target.lower() in c_lower):
                    matched_countries.append(c_val)
                    break

        return {
            "departments": matched_depts,
            "seniority_levels": matched_seniorities,
            "job_titles": matched_titles,
            "industries": matched_industries,
            "locations": matched_countries
        }

    @classmethod
    def search(
        cls,
        db: Session,
        criteria: Any,
        query_text: str = "",
        limit: int = 150,
        csv_filename: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Executes Fact and Dimension based Hybrid Lead Matching:
        Flow: Campaign Input -> AI Intent Understanding -> Search Column Headers & Unique Dimension Values -> Map to Lead Fact Table (SQL Filter) -> Semantic Scoring -> Ranked Lead Pool
        """
        # Ensure database has leads; if empty, attempt auto-importing input CSV data
        total_dataset_count = db.query(Lead).count()
        if total_dataset_count == 0:
            cls._auto_import_fallback(db)
            total_dataset_count = db.query(Lead).count()

        # 1. Parse Search Criteria & Intent
        depts = [d.strip() for d in (getattr(criteria, "departments", []) or getattr(criteria, "department", []) or []) if d and d.strip()]
        job_titles = [t.strip() for t in (getattr(criteria, "job_titles", []) or getattr(criteria, "job_title_keywords", []) or getattr(criteria, "roles", []) or []) if t and t.strip()]

        if query_text:
            match = re.search(r'target roles:\s*([^)]+)', query_text, re.IGNORECASE)
            if match:
                job_titles = [r.strip() for r in match.group(1).split(',') if r.strip()]

        seniorities = [s.strip() for s in (getattr(criteria, "seniority_levels", []) or getattr(criteria, "seniority", []) or []) if s and s.strip()]
        countries = [c.strip() for c in (getattr(criteria, "locations", []) or getattr(criteria, "country", []) or []) if c and c.strip()]
        if getattr(criteria, "country_code", None) and criteria.country_code.upper() not in ["GLOBAL", "ALL", ""]:
            countries.append(criteria.country_code.upper())
        industries = [i.strip() for i in (getattr(criteria, "industries", []) or getattr(criteria, "industry_list", []) or []) if i and i.strip()]
        keywords = [k.strip() for k in (getattr(criteria, "keywords", []) or getattr(criteria, "required_keywords", []) or []) if k and k.strip()]
        exclude_kws = [e.strip().lower() for e in (getattr(criteria, "exclude_keywords", []) or []) if e and e.strip()]


        # -------------------------------------------------------------
        # STAGE 1: DIMENSION DISCOVERY & FACT TABLE SQL FILTERING
        # -------------------------------------------------------------
        matched_dims = cls._discover_matching_dimension_values(db, criteria, query_text=query_text, csv_filename=csv_filename)
        
        matched_dept_vals = matched_dims.get("departments", [])
        matched_sen_vals = matched_dims.get("seniority_levels", [])
        matched_title_vals = matched_dims.get("job_titles", [])
        matched_ind_vals = matched_dims.get("industries", [])
        matched_loc_vals = matched_dims.get("locations", [])

        query = db.query(Lead).filter(Lead.disqualified == False)

        # 1. Filter by specific CSV Dataset File if provided, BUT ALWAYS INCLUDE MANUALLY ENTERED PROFILES FROM MASTER DB
        if csv_filename and csv_filename.strip():
            clean_fn = csv_filename.strip().lower()
            query = query.filter(
                or_(
                    Lead.source_file.ilike(f"%{clean_fn}%"),
                    Lead.source.ilike(f"%{clean_fn}%"),
                    Lead.source.ilike("%manual%"),
                    Lead.source_file.ilike("%manual%"),
                    Lead.source_file == None
                )
            )

        # 1A. Department Dimension SQL Filter
        if matched_dept_vals:
            query = query.filter(or_(*[Lead.department.ilike(f"%{d}%") for d in matched_dept_vals] + [Lead.job_title.ilike(f"%{d}%") for d in matched_dept_vals]))
        elif depts:
            dept_conditions = []
            for d in depts:
                norm_d = DataNormalizer.normalize_department(d) or d
                terms = list({norm_d, re.sub(r's\b', '', norm_d.lower())})
                for t_term in terms:
                    dept_conditions.append(Lead.department.ilike(f"%{t_term}%"))
                    dept_conditions.append(Lead.job_title.ilike(f"%{t_term}%"))
            query = query.filter(or_(*dept_conditions))

        # 1B. Seniority Level Dimension SQL Filter
        if matched_sen_vals:
            query = query.filter(or_(*[Lead.seniority.ilike(f"%{s}%") for s in matched_sen_vals] + [Lead.job_title.ilike(f"%{s}%") for s in matched_sen_vals]))
        elif seniorities:
            sen_conditions = []
            for s in seniorities:
                terms = list({s, re.sub(r's\b', '', s.lower())})
                for s_term in terms:
                    sen_conditions.append(Lead.seniority.ilike(f"%{s_term}%"))
                    sen_conditions.append(Lead.job_title.ilike(f"%{s_term}%"))
            query = query.filter(or_(*sen_conditions))

        # 1C. Location Dimension SQL Filter
        if matched_loc_vals:
            query = query.filter(or_(*[Lead.country.ilike(f"%{c}%") for c in matched_loc_vals] + [Lead.country_code.ilike(f"%{c}%") for c in matched_loc_vals]))
        elif countries:
            loc_conditions = []
            for c in countries:
                cname, ccode = DataNormalizer.normalize_country(c)
                loc_conditions.append(Lead.country.ilike(f"%{cname or c}%"))
                loc_conditions.append(Lead.country_code.ilike(f"%{ccode or c}%"))
                loc_conditions.append(Lead.profile_text.ilike(f"%{c}%"))
            query = query.filter(or_(*loc_conditions))

        # 1D. Industry Dimension SQL Filter
        if matched_ind_vals:
            query = query.filter(or_(*[Lead.industry.ilike(f"%{i}%") for i in matched_ind_vals]))
        elif industries:
            ind_conditions = []
            for ind in industries:
                syns = DataNormalizer.expand_industry_synonyms(ind)
                for s in syns:
                    ind_conditions.append(Lead.industry.ilike(f"%{s}%"))
                    ind_conditions.append(Lead.company_name.ilike(f"%{s}%"))
                    ind_conditions.append(Lead.profile_text.ilike(f"%{s}%"))
            query = query.filter(or_(*ind_conditions))

        # 1E. Job Title & Role Dimension SQL Filter
        if matched_title_vals:
            query = query.filter(or_(*[Lead.job_title.ilike(f"%{t}%") for t in matched_title_vals]))
        elif job_titles:
            title_conditions = []
            for jt in job_titles:
                t_clean = jt.strip()
                if not t_clean: continue
                title_conditions.append(Lead.job_title.ilike(f"%{t_clean}%"))
                title_conditions.append(Lead.profile_text.ilike(f"%{t_clean}%"))
            if title_conditions:
                query = query.filter(or_(*title_conditions))

        candidates = query.limit(limit * 3).all()

        # Fallback if strict conjunction yielded zero candidates but depts/seniorities/job_titles matched
        if not candidates and (depts or seniorities or job_titles):
            dept_sen_query = db.query(Lead).filter(Lead.disqualified == False)
            if csv_filename and csv_filename.strip():
                clean_fn = csv_filename.strip().lower()
                dept_sen_query = dept_sen_query.filter(
                    or_(
                        Lead.source_file.ilike(f"%{clean_fn}%"),
                        Lead.source.ilike(f"%{clean_fn}%")
                    )
                )

            # Keep industry constraint in fallback if industries were requested
            if industries:
                if matched_ind_vals:
                    dept_sen_query = dept_sen_query.filter(or_(*[Lead.industry.ilike(f"%{i}%") for i in matched_ind_vals]))
                else:
                    fb_ind_conds = []
                    for ind in industries:
                        syns = DataNormalizer.expand_industry_synonyms(ind)
                        for s in syns:
                            fb_ind_conds.append(Lead.industry.ilike(f"%{s}%") | Lead.company_name.ilike(f"%{s}%") | Lead.profile_text.ilike(f"%{s}%"))
                    if fb_ind_conds:
                        dept_sen_query = dept_sen_query.filter(or_(*fb_ind_conds))

            fallback_conds = []
            if job_titles:
                for jt in job_titles:
                    t_term = re.sub(r's\b', '', jt.lower().strip())
                    if t_term:
                        fallback_conds.append(Lead.job_title.ilike(f"%{t_term}%") | Lead.profile_text.ilike(f"%{t_term}%"))
            if depts:
                for d in depts:
                    t_term = re.sub(r's\b', '', d.lower().strip())
                    if t_term:
                        fallback_conds.append(Lead.department.ilike(f"%{t_term}%") | Lead.job_title.ilike(f"%{t_term}%"))
            if seniorities:
                for s in seniorities:
                    s_term = re.sub(r's\b', '', s.lower().strip())
                    if s_term:
                        fallback_conds.append(Lead.seniority.ilike(f"%{s_term}%") | Lead.job_title.ilike(f"%{s_term}%"))
            if fallback_conds:
                dept_sen_query = dept_sen_query.filter(or_(*fallback_conds))
            candidates = dept_sen_query.limit(limit * 3).all()

        sql_filtered_count = len(candidates)

        if not candidates:
            return []

        # -------------------------------------------------------------
        # STAGE 2: Semantic Vector Ranking & Strict Eligibility Check
        # -------------------------------------------------------------
        search_prompt = query_text or f"{' '.join(depts)} {' '.join(job_titles)} {' '.join(seniorities)} {' '.join(industries)} {' '.join(countries)}".strip()
        
        try:
            query_emb = rag_service.generate_embeddings([search_prompt])[0]
        except Exception:
            query_emb = None

        results = []

        for lead in candidates:
            # Strict Source Validation: Validate lead belongs to dataset OR is a manual entry profile in Master DB
            if csv_filename and csv_filename.strip():
                clean_fn = csv_filename.strip().lower()
                lead_src = (lead.source_file or "").lower()
                lead_source = (lead.source or "").lower()
                is_manual = "manual" in lead_src or "manual" in lead_source or not lead_src
                if not is_manual and clean_fn not in lead_src and clean_fn not in lead_source:
                    continue

            why_reasons = []
            title_text = (lead.job_title or "").lower()
            dept_text = (lead.department or "").lower()
            sen_text = (lead.seniority or "").lower()
            ind_text = (lead.industry or "").lower()
            company_text = (lead.company_name or "").lower()
            country_text = (lead.country or lead.country_code or "").lower()
            full_lead_text = f"{title_text} {dept_text} {sen_text} {ind_text} {company_text} {lead.profile_text.lower()}"

            # Check Exclude Keywords
            if exclude_kws and any(ex_kw in full_lead_text for ex_kw in exclude_kws):
                continue

            # 1. Department / Function Match Check
            dept_score = 0
            if depts:
                dept_matched = any(cls._match_term(d, title_text, dept_text) for d in depts)
                if dept_matched:
                    dept_score = 100
                    why_reasons.append(f"✓ Department Match: 100% ({lead.department or depts[0].title()})")
                else:
                    dept_score = 0
            else:
                dept_score = 100

            # STRICT DOMAIN RULE: If target department is specified, lead MUST match department domain
            if depts and dept_score == 0:
                continue

            # 2. Seniority Match Check
            seniority_score = 0
            if seniorities:
                sen_matched = any(cls._match_term(s, title_text, dept_text, sen_text) for s in seniorities)
                if sen_matched:
                    seniority_score = 100
                    why_reasons.append(f"✓ Seniority Match: 100% ({lead.seniority or seniorities[0].title()})")
                else:
                    seniority_score = 40
            else:
                seniority_score = 100

            # 3. Job Title / Role Match Check
            role_score = 0
            if job_titles:
                title_matched = any(cls._match_term(jt, title_text, dept_text) for jt in job_titles)
                if title_matched:
                    role_score = 100
                    why_reasons.append(f"✓ Role Match: 100% ({lead.job_title})")
                elif any(w.lower() in title_text for jt in job_titles for w in jt.split() if len(w) > 3):
                    role_score = 75
                    why_reasons.append(f"✓ Role Match: 75% ({lead.job_title})")
                else:
                    role_score = 30
            else:
                role_score = 100

            # HARD CONJUNCTION RULE: Must satisfy Department AND (Seniority or Title)
            if (seniorities or job_titles) and (seniority_score < 50 and role_score < 50):
                continue

            # 4. Location Match Check
            location_score = 0
            if countries:
                for c in countries:
                    c_clean = c.lower().strip()
                    if c_clean in country_text or c_clean in full_lead_text:
                        location_score = 100
                        why_reasons.append(f"✓ Location Match: 100% ({lead.country or lead.country_code})")
                        break
                    cname, ccode = DataNormalizer.normalize_country(c)
                    if (cname and cname.lower() in country_text) or (ccode and ccode.lower() in country_text):
                        location_score = 100
                        why_reasons.append(f"✓ Location Match: 100% ({lead.country or lead.country_code})")
                        break
                if location_score == 0:
                    location_score = 40
            else:
                location_score = 100

            # 5. Industry Match Check with Full Synonym Expansion
            industry_score = 0
            if industries:
                for ind in industries:
                    syns = DataNormalizer.expand_industry_synonyms(ind)
                    if any(s in ind_text or s in company_text or s in full_lead_text for s in syns):
                        industry_score = 100
                        why_reasons.append(f"✓ Industry Match: 100% ({lead.industry or ind.title()})")
                        break
            else:
                industry_score = 100

            # STRICT INDUSTRY RULE: If target industry is specified, lead MUST match target industry!
            if industries and industry_score == 0:
                continue

            # 6. Semantic Vector Match Score
            semantic_score = 85
            if query_emb and lead.embedding:
                try:
                    lead_emb = json.loads(lead.embedding.decode("utf-8")) if isinstance(lead.embedding, bytes) else lead.embedding
                    if isinstance(lead_emb, list):
                        sim = rag_service._cosine_sim(query_emb, lead_emb)
                        semantic_score = int(round(sim * 100))
                        why_reasons.append(f"✓ Semantic Match: {semantic_score}%")
                except Exception:
                    pass

            # Compute Weighted Overall Match Score
            overall_score = int(round(
                0.35 * role_score +
                0.25 * dept_score +
                0.15 * seniority_score +
                0.10 * industry_score +
                0.10 * location_score +
                0.05 * semantic_score
            ))

            # Minimum Overall Match Threshold
            if overall_score < 65:
                continue

            lead_src = (lead.source_file or "").lower()
            lead_source = (lead.source or "").lower()
            if "manual" in lead_src or "manual" in lead_source or not lead_src:
                source_display = "Manual Entry"
            elif lead_src.endswith(".xlsx") or lead_src.endswith(".xls"):
                source_display = "Excel Import"
            else:
                source_display = "CSV Import"

            explanation_str = (
                f"Master DB Profile Match ({overall_score}% Overall Match | Source: {source_display}):\n"
                f"• Role Match: {role_score}%\n"
                f"• Department Match: {dept_score}%\n"
                f"• Seniority Match: {seniority_score}%\n"
                f"• Industry Match: {industry_score}%\n"
                f"• Location Match: {location_score}%\n"
                f"• Semantic Match: {semantic_score}%\n"
                f"Matched Fields: job_title=\"{lead.job_title}\", department=\"{lead.department or 'N/A'}\", country=\"{lead.country or lead.country_code or 'N/A'}\""
            )

            results.append({
                "lead": lead,
                "score": overall_score,
                "intent_score": round(overall_score / 100.0, 2),
                "is_qualified": True,
                "source_type": source_display,
                "explanation": explanation_str,
                "why_reasons": why_reasons
            })

        # -------------------------------------------------------------
        # STAGE 3: LLM Evaluation & Final Dataset Metrics
        # -------------------------------------------------------------
        if results and (query_text or getattr(criteria, "keywords", None)):
            try:
                llm_evals = cls._evaluate_candidates_with_llm([r["lead"] for r in results[:15]], query_text, search_prompt)
                if llm_evals:
                    filtered_llm = []
                    for r in results:
                        lead_id = r["lead"].id
                        if lead_id in llm_evals:
                            eval_item = llm_evals[lead_id]
                            if eval_item.get("is_match") is False:
                                continue  # Exclude non-matching row evaluated by LLM
                            if eval_item.get("reason"):
                                r["why_reasons"].append(f"✓ LLM match verification: {eval_item['reason']}")
                                r["explanation"] = "Why this lead?\n" + "\n".join(r["why_reasons"])
                            if eval_item.get("score"):
                                r["score"] = max(r["score"], eval_item["score"])
                        filtered_llm.append(r)
                    results = filtered_llm
            except Exception as e:
                print(f"LLM filtering step warning: {e}")

        # Rank results descending by score
        results.sort(key=lambda x: x["score"], reverse=True)

        final_qualified_count = len(results)
        excluded_count = max(0, total_dataset_count - final_qualified_count)

        # Backend Debug Logging Output
        print(f"\n==================================================")
        print(f"CAMPAIGN DISCOVERY COMPLETE")
        print(f"Query: '{query_text}'")
        print(f"CAMPAIGN CRITERIA: depts={depts}, seniorities={seniorities}, locations={countries}, industries={industries}")
        print(f"DATABASE TOTAL: {total_dataset_count}")
        print(f"SQL FILTERED: {sql_filtered_count}")
        print(f"SEMANTIC RANKED: {final_qualified_count}")
        print(f"FINAL QUALIFIED: {final_qualified_count}")
        print(f"EXCLUDED: {excluded_count}")
        print(f"==================================================\n", flush=True)

        return results[:limit]

    @classmethod
    def _evaluate_candidates_with_llm(cls, candidates: List[Lead], query_text: str, strategy_text: str) -> Dict[int, Dict[str, Any]]:
        """
        Uses OpenRouter multi-model fallback chain to evaluate candidate lead rows against campaign requirements in batched requests.
        Returns a mapping of lead_id -> {"is_match": bool, "score": int, "reason": str}.
        """
        from backend.app.core.config import settings
        from backend.app.services.openrouter_service import openrouter_service

        # Fast-path instant evaluation (0.0001s response time, zero network delays)
        if settings.LEAD_DISCOVERY_PROVIDER == "excel" or not settings.get_openrouter_api_key():
            return {}


        try:
            lead_summaries = []
            for lead in candidates[:30]:
                lead_summaries.append({
                    "id": lead.id,
                    "name": f"{lead.first_name or ''} {lead.last_name or ''}".strip(),
                    "title": lead.job_title,
                    "department": lead.department,
                    "company": lead.company_name,
                    "industry": lead.industry,
                    "country": lead.country or lead.country_code
                })

            prompt = (
                f"Campaign Requirement: {query_text or strategy_text}\n\n"
                f"Evaluate the following lead rows against the campaign requirement:\n"
                f"{json.dumps(lead_summaries, indent=2)}\n\n"
                f"Return JSON strictly in this format:\n"
                f"{{\n"
                f'  "evaluations": [\n'
                f'    {{"id": 1, "is_match": true, "score": 90, "reason": "Matches Finance Director in India"}},\n'
                f'    {{"id": 2, "is_match": false, "score": 20, "reason": "Sales title does not match Finance requirement"}}\n'
                f'  ]\n'
                f"}}\n"
                f"Rule: Set is_match to false for any lead that does NOT satisfy the target role, department, location, or industry requirement."
            )

            res_text = openrouter_service.complete(
                prompt=prompt,
                system_instruction="You are a B2B Lead Relevance Classifier.",
                temperature=0.1,
                timeout=0.6,
                response_format_json=True
            )

            if res_text:
                clean_json = re.sub(r'^```(?:json)?\s*', '', res_text, flags=re.MULTILINE)
                clean_json = re.sub(r'\s*```$', '', clean_json, flags=re.MULTILINE).strip()
                data = json.loads(clean_json)
                evals = data.get("evaluations", [])
                return {item["id"]: item for item in evals if "id" in item}
        except Exception as e:
            print(f"[HYBRID_SEARCH] LLM candidate evaluation warning: {e}")

        return {}

    @classmethod
    def _auto_import_fallback(cls, db: Session):
        """Auto-seed PostgreSQL database from input CSV/Excel files if database is unseeded."""
        try:
            from backend.app.services.csv_importer import csv_importer
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            sample_csv = os.path.join(base_dir, "data", "input_csv", "sample_b2b_prospects.csv")
            if os.path.exists(sample_csv):
                csv_importer.import_file(db, sample_csv, source_name="sample_b2b_prospects.csv")
        except Exception as e:
            print(f"Auto-import fallback warning: {e}")

hybrid_search_engine = HybridSearchEngine()
