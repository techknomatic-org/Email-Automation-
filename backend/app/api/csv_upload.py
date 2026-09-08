import os
import csv
import io
import re
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.lead import Lead

router = APIRouter(prefix="/csv", tags=["CSV Upload & Input Data"])

INPUT_CSV_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
    "data",
    "input_csv"
)

def ensure_csv_dir():
    os.makedirs(INPUT_CSV_DIR, exist_ok=True)

def parse_csv_metadata(file_path: str) -> Dict[str, Any]:
    """Extract headers, row count, detected roles, industries, and sample rows from a CSV or Excel file."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    fname_lower = file_path.lower()

    # ── Excel branch ──────────────────────────────────────────────────────────
    if fname_lower.endswith('.xlsx') or fname_lower.endswith('.xls'):
        try:
            import pandas as pd
            df = pd.read_excel(file_path, dtype=str).fillna('')
            headers = list(df.columns)
            rows_raw = df.values.tolist()
        except Exception as e:
            raise ValueError(f"Cannot read Excel file: {e}")

        # Map column names → indices the same as CSV logic below
        h_map = {h.strip().lower().replace('_', ' ').replace('-', ' '): i for i, h in enumerate(headers)}
        def find_idx(*terms):
            for t in terms:
                for hk, idx in h_map.items():
                    if t in hk: return idx
            return -1

        title_idx   = find_idx('title', 'role', 'designation', 'position')
        company_idx = find_idx('company', 'organization', 'firm')
        industry_idx= find_idx('industry', 'sector', 'domain')
        country_idx = find_idx('country', 'location', 'city', 'state')
        email_idx   = find_idx('email', 'e-mail')
        name_idx    = find_idx('name', 'contact')

        detected_roles = set()
        detected_industries = set()
        sample_leads = []

        for r in rows_raw:
            def g(idx): return str(r[idx]).strip() if idx >= 0 and idx < len(r) else ''
            title = g(title_idx); comp = g(company_idx); ind = g(industry_idx)
            country = g(country_idx); email = g(email_idx); name = g(name_idx)
            if title: detected_roles.add(title)
            if ind:   detected_industries.add(ind)
            if len(sample_leads) < 10:
                sample_leads.append({'name': name or 'Prospect', 'title': title or 'Executive',
                                     'company': comp or 'Company', 'industry': ind or 'B2B',
                                     'country': country or 'Global', 'email': email})
        return {
            'filename': os.path.basename(file_path),
            'total_rows': len(rows_raw),
            'headers': headers,
            'detected_roles': list(detected_roles)[:10],
            'detected_industries': list(detected_industries)[:8],
            'sample_rows': sample_leads,
        }

    # ── CSV branch ────────────────────────────────────────────────────────────
    rows = []
    headers = []
    with open(file_path, "r", encoding="utf-8-sig", errors="ignore") as f:
        reader = csv.reader(f)
        try:
            headers = [h.strip() for h in next(reader, [])]
        except Exception:
            headers = []
        for r in reader:
            if any(cell.strip() for cell in r):
                rows.append(r)

    # Detect key columns by matching headers
    title_idx = -1
    company_idx = -1
    industry_idx = -1
    country_idx = -1
    email_idx = -1
    name_idx = -1

    for idx, h in enumerate(headers):
        h_lower = h.lower().replace("_", " ").replace("-", " ")
        if any(term in h_lower for term in ["title", "role", "designation", "position"]):
            title_idx = idx
        elif any(term in h_lower for term in ["company", "organization", "firm"]):
            company_idx = idx
        elif any(term in h_lower for term in ["industry", "sector", "domain"]):
            industry_idx = idx
        elif any(term in h_lower for term in ["country", "location", "city", "state"]):
            country_idx = idx
        elif any(term in h_lower for term in ["email", "e-mail"]):
            email_idx = idx
        elif any(term in h_lower for term in ["name", "contact"]):
            name_idx = idx

    detected_roles = set()
    detected_industries = set()
    detected_countries = set()
    sample_leads = []

    for r in rows:
        title = r[title_idx].strip() if title_idx >= 0 and title_idx < len(r) else ""
        comp = r[company_idx].strip() if company_idx >= 0 and company_idx < len(r) else ""
        ind = r[industry_idx].strip() if industry_idx >= 0 and industry_idx < len(r) else ""
        country = r[country_idx].strip() if country_idx >= 0 and country_idx < len(r) else ""
        email = r[email_idx].strip() if email_idx >= 0 and email_idx < len(r) else ""
        name = r[name_idx].strip() if name_idx >= 0 and name_idx < len(r) else ""

        if title:
            detected_roles.add(title)
        if ind:
            detected_industries.add(ind)
        if country:
            detected_countries.add(country)

        if len(sample_leads) < 10:
            sample_leads.append({
                "name": name or "Prospect",
                "title": title or "Executive",
                "company": comp or "Company",
                "industry": ind or "B2B",
                "country": country or "Global",
                "email": email
            })

    return {
        "filename": os.path.basename(file_path),
        "total_rows": len(rows),
        "headers": headers,
        "detected_roles": list(detected_roles)[:10],
        "detected_industries": list(detected_industries)[:8],
        "detected_countries": list(detected_countries)[:8],
        "sample_rows": sample_leads
    }


@router.get("/files")
def list_csv_files():
    """List all available input CSV and Excel files in data/input_csv directory."""
    ensure_csv_dir()
    files = []
    supported_exts = ('.csv', '.xlsx', '.xls')
    for fname in sorted(os.listdir(INPUT_CSV_DIR)):
        if not fname.lower().endswith(supported_exts):
            continue
        fpath = os.path.join(INPUT_CSV_DIR, fname)
        stat = os.stat(fpath)
        try:
            meta = parse_csv_metadata(fpath)
        except Exception:
            meta = {"total_rows": 0, "headers": [], "detected_roles": [], "detected_industries": []}

        files.append({
            "filename": fname,
            "size_bytes": stat.st_size,
            "total_rows": meta.get("total_rows", 0),
            "headers": meta.get("headers", []),
            "detected_roles": meta.get("detected_roles", []),
            "detected_industries": meta.get("detected_industries", []),
        })
    return {"files": files}


@router.post("/upload")
async def upload_csv_file(
    file: UploadFile = File(...),
    import_as_leads: bool = Form(True),
    import_mode: str = Form("append"),
    db: Session = Depends(get_db)
):
    """Upload a CSV/Excel file into data/input_csv/ directory and import into PostgreSQL database."""
    ensure_csv_dir()
    fname_lower = file.filename.lower()
    if not (fname_lower.endswith(".csv") or fname_lower.endswith(".xlsx") or fname_lower.endswith(".xls")):
        raise HTTPException(status_code=400, detail="Only CSV (.csv) or Excel (.xlsx, .xls) files are supported.")

    safe_filename = re.sub(r'[^a-zA-Z0-9_\.-]', '_', file.filename)
    target_path = os.path.join(INPUT_CSV_DIR, safe_filename)

    content = await file.read()
    with open(target_path, "wb") as f:
        f.write(content)

    try:
        meta = parse_csv_metadata(target_path)
    except Exception:
        meta = {"filename": safe_filename}

    import_stats = None
    if import_as_leads:
        from backend.app.services.csv_importer import csv_importer
        import_stats = csv_importer.import_file(db, target_path, source_name=safe_filename, import_mode=import_mode)

    return {
        "success": True,
        "message": f"File '{safe_filename}' uploaded and ingested into PostgreSQL lead database.",
        "filename": safe_filename,
        "file_path": target_path,
        "metadata": meta,
        "import_stats": import_stats
    }


@router.post("/import/{filename}")
def import_existing_csv_file(
    filename: str,
    campaign_id: Optional[int] = None,
    import_mode: str = "append",
    db: Session = Depends(get_db)
):
    """Import an existing CSV/Excel file from data/input_csv/ into PostgreSQL database."""
    ensure_csv_dir()
    safe_filename = os.path.basename(filename)
    target_path = os.path.join(INPUT_CSV_DIR, safe_filename)
    if not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail=f"File '{filename}' not found in data/input_csv/")

    from backend.app.services.csv_importer import csv_importer
    import_stats = csv_importer.import_file(db, target_path, source_name=safe_filename, import_mode=import_mode)

    if campaign_id:
        from backend.app.services.lead_discovery_service import generate_lead_pool_for_campaign
        try:
            generate_lead_pool_for_campaign(db, campaign_id, refresh=True)
        except Exception:
            pass

    return {
        "success": True,
        "message": f"File '{safe_filename}' imported into PostgreSQL database.",
        "filename": safe_filename,
        "import_stats": import_stats
    }


@router.get("/preview/{filename}")
def preview_csv_file(filename: str):
    """Get metadata and top sample rows for a specific CSV file in data/input_csv/."""
    ensure_csv_dir()
    safe_filename = os.path.basename(filename)
    target_path = os.path.join(INPUT_CSV_DIR, safe_filename)
    if not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail=f"CSV file '{filename}' not found in data/input_csv/")

    meta = parse_csv_metadata(target_path)
    return meta


@router.delete("/files/{filename}")
def delete_csv_file(filename: str, db: Session = Depends(get_db)):
    """Delete a CSV dataset file from data/input_csv/ and associated DB leads."""
    from sqlalchemy import or_
    ensure_csv_dir()
    safe_filename = os.path.basename(filename)
    target_path = os.path.join(INPUT_CSV_DIR, safe_filename)

    deleted_file = False
    if os.path.exists(target_path):
        try:
            os.remove(target_path)
            deleted_file = True
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")

    # Delete associated leads from PostgreSQL Lead table
    deleted_leads_count = 0
    try:
        leads_to_delete = db.query(Lead).filter(
            or_(
                Lead.source_file.ilike(f"%{safe_filename}%"),
                Lead.source.ilike(f"%{safe_filename}%")
            )
        ).all()
        deleted_leads_count = len(leads_to_delete)
        for l in leads_to_delete:
            db.delete(l)
        db.commit()
    except Exception as e:
        db.rollback()

    return {
        "success": True,
        "message": f"File '{safe_filename}' deleted. Removed {deleted_leads_count} associated lead records.",
        "filename": safe_filename,
        "deleted_leads": deleted_leads_count
    }


@router.get("/validation-stats")
def get_dataset_validation_stats(db: Session = Depends(get_db)):
    """
    Validate the PostgreSQL lead dataset schema across all 9 required fields:
    first_name, last_name, email, job_title, company_name, industry, country, seniority, department.
    """
    leads = db.query(Lead).all()
    total_count = len(leads)
    if total_count == 0:
        return {
            "total_records": 0,
            "records_with_first_name": 0,
            "records_with_last_name": 0,
            "records_with_email": 0,
            "records_with_job_title": 0,
            "records_with_company_name": 0,
            "records_with_industry": 0,
            "records_with_country": 0,
            "records_with_seniority": 0,
            "records_with_department": 0,
            "usable_matching_records": 0,
            "is_valid": False,
            "missing_fields_warning": "No leads found in PostgreSQL database. Upload a CSV dataset first."
        }

    with_first_name = sum(1 for l in leads if (l.first_name or (l.source_fields or {}).get("first_name")))
    with_last_name = sum(1 for l in leads if (l.last_name or (l.source_fields or {}).get("last_name")))
    with_email = sum(1 for l in leads if (l.email or (l.source_fields or {}).get("email")))
    with_job_title = sum(1 for l in leads if (l.job_title or (l.source_fields or {}).get("job_title")))
    with_company = sum(1 for l in leads if (l.company_name or (l.source_fields or {}).get("company")))
    with_industry = sum(1 for l in leads if (l.industry or (l.source_fields or {}).get("industry")))
    with_country = sum(1 for l in leads if (l.country or l.country_code or (l.source_fields or {}).get("country")))
    with_seniority = sum(1 for l in leads if (l.seniority or (l.source_fields or {}).get("seniority")))
    with_dept = sum(1 for l in leads if (l.department or (l.source_fields or {}).get("department")))

    usable_matching = sum(
        1 for l in leads
        if (l.job_title or (l.source_fields or {}).get("job_title"))
        and (l.department or (l.source_fields or {}).get("department"))
        and (l.seniority or (l.source_fields or {}).get("seniority"))
        and (l.industry or (l.source_fields or {}).get("industry"))
        and (l.country or l.country_code or (l.source_fields or {}).get("country"))
    )

    missing = []
    if with_job_title < total_count: missing.append(f"job_title ({total_count - with_job_title} missing)")
    if with_dept < total_count: missing.append(f"department ({total_count - with_dept} missing)")
    if with_seniority < total_count: missing.append(f"seniority ({total_count - with_seniority} missing)")
    if with_industry < total_count: missing.append(f"industry ({total_count - with_industry} missing)")
    if with_country < total_count: missing.append(f"country ({total_count - with_country} missing)")

    warning = ""
    if missing:
        warning = f"Insufficient dataset fields: {', '.join(missing)}. Missing fields will NOT be invented by AI."

    return {
        "total_records": total_count,
        "records_with_first_name": with_first_name,
        "records_with_last_name": with_last_name,
        "records_with_email": with_email,
        "records_with_job_title": with_job_title,
        "records_with_company_name": with_company,
        "records_with_industry": with_industry,
        "records_with_country": with_country,
        "records_with_seniority": with_seniority,
        "records_with_department": with_dept,
        "usable_matching_records": usable_matching,
        "is_valid": len(missing) == 0,
        "missing_fields_warning": warning
    }
