import os
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.email_service import EmailService
from backend.app.models.mailbox import Mailbox
from email.mime.multipart import MIMEMultipart

client = TestClient(app)


def test_upload_valid_attachment(tmp_path):
    """Test uploading valid supported email attachment files."""
    test_pdf = tmp_path / "sample_proposal.pdf"
    test_pdf.write_bytes(b"%PDF-1.4 Mock PDF Content for Email Attachment")

    with open(test_pdf, "rb") as f:
        response = client.post(
            "/api/v1/attachments/upload",
            files={"file": ("sample_proposal.pdf", f, "application/pdf")}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "sample_proposal.pdf"
    assert data["ext"] == "pdf"
    assert data["filesize"] > 0
    assert os.path.exists(data["filepath"])

    # Cleanup created file
    if os.path.exists(data["filepath"]):
        os.remove(data["filepath"])


def test_upload_invalid_file_extension(tmp_path):
    """Test uploading unsupported file extension raises 400 Bad Request error."""
    test_exe = tmp_path / "malware.exe"
    test_exe.write_bytes(b"MZ... executable file")

    with open(test_exe, "rb") as f:
        response = client.post(
            "/api/v1/attachments/upload",
            files={"file": ("malware.exe", f, "application/octet-stream")}
        )

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "Unsupported file format '.exe'" in detail


def test_upload_oversized_file(tmp_path, monkeypatch):
    """Test file exceeding 10MB limit raises 400 Bad Request error."""
    test_large = tmp_path / "large_deck.pptx"
    # Write 11 MB dummy bytes
    test_large.write_bytes(b"0" * (11 * 1024 * 1024))

    with open(test_large, "rb") as f:
        response = client.post(
            "/api/v1/attachments/upload",
            files={"file": ("large_deck.pptx", f, "application/vnd.openxmlformats-officedocument.presentationml.presentation")}
        )

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "exceeds the maximum allowed size of 10 MB" in detail


def test_email_service_mime_construction_with_attachments(tmp_path):
    """Test EmailService correctly constructs MIME message with CC, BCC, and user attachments."""
    att1 = tmp_path / "report.csv"
    att1.write_text("id,name,value\n1,Alpha,100\n2,Beta,200\n")

    att2 = tmp_path / "deck.pdf"
    att2.write_bytes(b"%PDF-1.4 Mock Presentation Deck Bytes")

    msg = MIMEMultipart("mixed")
    msg["Subject"] = "Quarterly Report & Pitch"
    msg["From"] = "sender@openoutreach.io"
    msg["To"] = "prospect@client.com"
    msg["Cc"] = "manager@client.com"
    msg["Bcc"] = "audit@openoutreach.io"

    attachments_list = [
        {"filepath": str(att1), "filename": "report.csv"},
        {"filepath": str(att2), "filename": "deck.pdf"}
    ]

    from backend.app.services.email_service import attach_user_files
    attach_user_files(msg, attachments_list)

    msg_str = msg.as_string()
    assert "Content-Disposition: attachment; filename=\"report.csv\"" in msg_str
    assert "Content-Disposition: attachment; filename=\"deck.pdf\"" in msg_str
    assert "Cc: manager@client.com" in msg_str
    assert "Bcc: audit@openoutreach.io" in msg_str


def test_simulate_send_with_attachments():
    """Test EmailService.simulate_send records attachments, cc, and bcc."""
    result = EmailService.simulate_send(
        to_address="prospect@company.com",
        subject="Demo Meeting",
        body="Here is our proposal.",
        cc=["vp@company.com"],
        bcc=["tracker@openoutreach.io"],
        attachments=[
            {"filename": "proposal.pdf", "filepath": "/tmp/proposal.pdf"},
            {"filename": "contract.docx", "filepath": "/tmp/contract.docx"}
        ]
    )

    assert result["success"] is True
    assert result["simulated"] is True
    assert result["to"] == "prospect@company.com"
    assert result["cc"] == ["vp@company.com"]
    assert result["bcc"] == ["tracker@openoutreach.io"]
    assert "Corporate_Capabilities_Overview.pdf" in result["attachments"]
    assert "proposal.pdf" in result["attachments"]
    assert "contract.docx" in result["attachments"]


def test_attach_default_banner_corporate_capabilities():
    """Test attach_default_banner attaches Corporate_Capabilities_Overview.pdf to MIME message."""
    from backend.app.services.email_service import attach_default_banner
    msg = MIMEMultipart("mixed")
    attached = attach_default_banner(msg)
    assert attached is True
    msg_str = msg.as_string()
    assert "Corporate_Capabilities_Overview.pdf" in msg_str
    assert "Content-Disposition: attachment; filename=\"Corporate_Capabilities_Overview.pdf\"" in msg_str
