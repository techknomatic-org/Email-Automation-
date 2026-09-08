import os
import uuid
import re
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from fastapi.responses import FileResponse

router = APIRouter(prefix="/attachments", tags=["Attachments"])

ALLOWED_EXTENSIONS = {
    "pdf", "doc", "docx", "xls", "xlsx", "csv", "ppt", "pptx", "txt", "png", "jpg", "jpeg"
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB per file

ATTACHMENTS_DIR = os.path.join(os.getcwd(), "uploads", "attachments")
os.makedirs(ATTACHMENTS_DIR, exist_ok=True)


def sanitize_filename(filename: str) -> str:
    """Sanitize original filename to prevent path traversal security issues."""
    filename = os.path.basename(filename)
    filename = re.sub(r'[^\w\.\-]', '_', filename)
    return filename or "attachment"


@router.post("/upload")
async def upload_attachment(file: UploadFile = File(...)):
    """
    Upload an email attachment with format and size validation.
    Supported extensions: PDF, DOC/DOCX, XLS/XLSX, CSV, PPT/PPTX, TXT, PNG, JPG/JPEG
    Max size limit: 10MB
    """
    if not file or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided."
        )

    # Validate file extension
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        allowed_str = ", ".join(sorted(list(ALLOWED_EXTENSIONS))).upper()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '.{ext}'. Supported formats: {allowed_str}"
        )

    # Read content to check file size
    content = await file.read()
    file_size = len(content)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File '{file.filename}' exceeds the maximum allowed size of 10 MB (File size: {file_size / (1024 * 1024):.2f} MB)."
        )

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File '{file.filename}' is empty."
        )

    safe_name = sanitize_filename(file.filename)
    unique_id = uuid.uuid4().hex
    stored_filename = f"{unique_id}_{safe_name}"
    filepath = os.path.join(ATTACHMENTS_DIR, stored_filename)

    with open(filepath, "wb") as f:
        f.write(content)

    content_type = file.content_type or "application/octet-stream"

    return {
        "id": unique_id,
        "filename": file.filename,
        "filepath": filepath,
        "stored_filename": stored_filename,
        "filesize": file_size,
        "content_type": content_type,
        "ext": ext
    }


@router.get("/{stored_filename}")
async def get_attachment(stored_filename: str):
    """Retrieve/download an uploaded attachment file."""
    safe_name = sanitize_filename(stored_filename)
    filepath = os.path.join(ATTACHMENTS_DIR, safe_name)

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Attachment file not found.")

    return FileResponse(filepath)
