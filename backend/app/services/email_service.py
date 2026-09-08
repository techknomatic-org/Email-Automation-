import os
import re
import ssl
import base64
import smtplib
import requests
import mimetypes
from datetime import datetime
from typing import Optional, Dict, Any, List
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from sqlalchemy.orm import Session
from backend.app.models.mailbox import Mailbox


def get_default_pdf_path() -> Optional[str]:
    """Resolve the absolute path to the default PDF overview across runtime working directories."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    candidates = [
        os.path.join(base_dir, "static", "Corporate_Capabilities_Overview.pdf"),
        os.path.join(base_dir, "static", "openoutreach-banner.pdf"),
        os.path.join(os.getcwd(), "backend", "app", "static", "Corporate_Capabilities_Overview.pdf"),
        os.path.join(os.getcwd(), "backend", "app", "static", "openoutreach-banner.pdf"),
        os.path.join(os.getcwd(), "static", "Corporate_Capabilities_Overview.pdf"),
        os.path.join(os.getcwd(), "static", "openoutreach-banner.pdf"),
        r"C:\Users\pooja.khalekar\Desktop\email\OpenOutreach-main\backend\app\static\Corporate_Capabilities_Overview.pdf",
    ]
    for p in candidates:
        if os.path.exists(p) and os.path.getsize(p) > 0:
            return os.path.abspath(p)
    return None


def attach_default_banner(msg: MIMEMultipart, user_attachments: Optional[List[Any]] = None):
    """Attach Corporate_Capabilities_Overview.pdf as default email PDF attachment if not already provided."""
    try:
        # Check if user already provided Corporate_Capabilities_Overview
        if user_attachments:
            for att in user_attachments:
                fn = ""
                if isinstance(att, dict):
                    fn = att.get("filename") or os.path.basename(att.get("filepath") or att.get("path") or "")
                elif isinstance(att, str):
                    fn = os.path.basename(att)
                if fn and "Corporate_Capabilities_Overview" in fn:
                    return False  # Already attached by user

        pdf_path = get_default_pdf_path()
        if pdf_path and os.path.exists(pdf_path):
            with open(pdf_path, "rb") as f:
                pdf_data = f.read()
            filename = "Corporate_Capabilities_Overview.pdf"
            part = MIMEBase("application", "pdf", name=filename)
            part.set_payload(pdf_data)
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", "attachment", filename=filename)
            msg.attach(part)
            print(f"[DEFAULT ATTACHMENT SUCCESS] Attached {filename} ({len(pdf_data)} bytes) from {pdf_path}")
            return True
        else:
            print(f"[DEFAULT ATTACHMENT NOTICE] Corporate_Capabilities_Overview.pdf not found in static directories")
            return False
    except Exception as err:
        print(f"[ATTACHMENT NOTICE] Could not attach default PDF banner: {err}")
        return False


def attach_user_files(msg: MIMEMultipart, attachments: Optional[List[Any]] = None):
    """Attach user-specified attachment files to MIMEMultipart message."""
    if not attachments:
        return
    for att in attachments:
        try:
            if isinstance(att, dict):
                filepath = att.get("filepath") or att.get("path")
                filename = att.get("filename") or (os.path.basename(filepath) if filepath else "attachment")
            elif isinstance(att, str):
                filepath = att
                filename = os.path.basename(att)
            else:
                continue

            if not filepath or not os.path.exists(filepath):
                print(f"[ATTACHMENT WARNING] File not found: {filepath}")
                continue

            ctype, encoding = mimetypes.guess_type(filepath)
            if ctype is None or encoding is not None:
                ctype = "application/octet-stream"
            maintype, subtype = ctype.split("/", 1)

            with open(filepath, "rb") as fp:
                file_data = fp.read()

            part = MIMEBase(maintype, subtype)
            part.set_payload(file_data)
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", "attachment", filename=filename)
            msg.attach(part)
            print(f"[ATTACHMENT SUCCESS] Attached '{filename}' ({len(file_data)} bytes)")
        except Exception as e:
            print(f"[ATTACHMENT ERROR] Failed to attach '{att}': {e}")


class EmailService:

    @staticmethod
    def refresh_google_access_token(mailbox: Mailbox, db: Optional[Session] = None) -> Optional[str]:
        """Automatically refresh expired Google OAuth 2.0 access token using refresh_token."""
        client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
        client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
        if not client_id or not client_secret or not mailbox.refresh_token:
            return None

        token_url = "https://oauth2.googleapis.com/token"
        data = {
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": mailbox.refresh_token,
            "grant_type": "refresh_token"
        }
        try:
            resp = requests.post(token_url, data=data, timeout=10)
            if resp.status_code == 200:
                tokens = resp.json()
                new_access_token = tokens.get("access_token")
                if new_access_token:
                    mailbox.access_token = new_access_token
                    if db:
                        db.commit()
                    return new_access_token
        except Exception as e:
            print(f"[OAUTH ERROR] Token refresh failed for mailbox #{mailbox.id}: {e}")
        return None

    @staticmethod
    def send_via_gmail_api(
        mailbox: Mailbox,
        to_address: str,
        subject: str,
        body: str,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[Any]] = None,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Send an email strictly using Google Gmail API (users.messages.send).
        STRICTLY NO SMTP connection or fallback.
        """
        print(f"EMAIL SEND START | Mailbox ID: {mailbox.id} | Provider: Gmail | Auth Type: OAuth 2.0 | From: {mailbox.from_address} | To: {to_address} | Sending Method: Gmail API")

        access_token = mailbox.access_token
        if not access_token and mailbox.refresh_token:
            access_token = EmailService.refresh_google_access_token(mailbox, db)

        if not access_token:
            return {
                "success": False,
                "sending_method": "Gmail API",
                "error": "Gmail authorization has expired or been revoked. Please reconnect this mailbox."
            }

        # Build standard RFC 2822 MIME message formatted as a direct 1-to-1 personal email
        msg = MIMEMultipart("mixed")
        msg["Subject"] = subject
        msg["From"] = mailbox.from_address
        msg["To"] = to_address
        import email.utils
        msg["Date"] = email.utils.formatdate(localtime=True)
        domain = mailbox.from_address.split("@")[-1] if "@" in mailbox.from_address else "gmail.com"
        msg["Message-ID"] = f"<{int(datetime.utcnow().timestamp())}.{os.urandom(6).hex()}@{domain}>"

        if cc:
            cc_str = ", ".join(cc) if isinstance(cc, list) else str(cc)
            if cc_str.strip():
                msg["Cc"] = cc_str.strip()

        if bcc:
            bcc_str = ", ".join(bcc) if isinstance(bcc, list) else str(bcc)
            if bcc_str.strip():
                msg["Bcc"] = bcc_str.strip()

        alt_part = MIMEMultipart("alternative")
        if "<p>" in body or "<br>" in body or "<div>" in body or "<span>" in body:
            plain_text = re.sub(r'<[^>]+>', '', body)
            part_text = MIMEText(plain_text, "plain", "utf-8")
            part_html = MIMEText(f"<html><body>{body}</body></html>", "html", "utf-8")
        else:
            part_text = MIMEText(body, "plain", "utf-8")
            html_body = body.replace("\n", "<br>")
            part_html = MIMEText(f"<html><head><meta charset=\"utf-8\"></head><body style=\"font-family: Arial, sans-serif; font-size: 14px; color: #222222; line-height: 1.5;\"><p>{html_body}</p></body></html>", "html", "utf-8")

        alt_part.attach(part_text)
        alt_part.attach(part_html)
        msg.attach(alt_part)

        # Attach default corporate overview PDF attachment
        attach_default_banner(msg, attachments)

        # Attach user-specified attachments
        attach_user_files(msg, attachments)

        # Pre-send MIME structure verification
        mime_filenames = [p.get_filename() for p in msg.walk() if p.get_filename()]
        print(f"[MIME OUTGOING VERIFICATION] Gmail API payload ready with {len(mime_filenames)} attachment(s): {mime_filenames}")

        # Base64url encode raw MIME message bytes
        raw_mime = base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        gmail_url = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"

        try:
            resp = requests.post(gmail_url, json={"raw": raw_mime}, headers=headers, timeout=12)

            # Auto-retry once on 401 Unauthorized using refresh token
            if resp.status_code == 401 and mailbox.refresh_token:
                print(f"[OAUTH NOTICE] Access token expired for mailbox #{mailbox.id}, refreshing token...")
                new_token = EmailService.refresh_google_access_token(mailbox, db)
                if new_token:
                    headers["Authorization"] = f"Bearer {new_token}"
                    resp = requests.post(gmail_url, json={"raw": raw_mime}, headers=headers, timeout=12)

            if resp.status_code == 200:
                res_data = resp.json()
                message_id = res_data.get("id", f"<gmail-api-{int(datetime.utcnow().timestamp())}>")
                print(f"EMAIL SEND SUCCESS | Method: Gmail API | Message ID: {message_id} | Attachments: {mime_filenames}")
                return {
                    "success": True,
                    "sending_method": "Gmail API",
                    "message_id": message_id,
                    "thread_id": res_data.get("threadId"),
                    "attachments": mime_filenames,
                    "sent_at": datetime.utcnow().isoformat()
                }
            else:
                if resp.status_code == 403 and "insufficient" in resp.text.lower():
                    err_msg = "Gmail OAuth Token Lacks Email Send Permission. Please click 'Disconnect' on this mailbox and then click 'Connect Gmail with OAuth 2.0' to re-authorize with full permissions."
                else:
                    err_msg = f"Unable to send email through Gmail API ({resp.status_code}): {resp.text}"
                print(f"EMAIL SEND ERROR | Method: Gmail API | {err_msg}")
                return {
                    "success": False,
                    "sending_method": "Gmail API",
                    "error": err_msg
                }
        except Exception as err:
            err_msg = f"Gmail API Connection Error: {str(err)}"
            print(f"EMAIL SEND ERROR | Method: Gmail API | {err_msg}")
            return {
                "success": False,
                "sending_method": "Gmail API",
                "error": err_msg
            }

    @staticmethod
    def send_email(
        smtp_host: str,
        smtp_port: int,
        username: str,
        password: str,
        from_address: str,
        to_address: str,
        subject: str,
        body: str,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[Any]] = None,
        use_tls: bool = True,
    ) -> Dict[str, Any]:
        """Send an email via Custom SMTP credentials."""
        usr_lower = (username or "").lower()
        pwd_lower = (password or "").lower()
        if any(dummy_word in usr_lower or dummy_word in pwd_lower for dummy_word in ["demo", "example", "placeholder", "test", "app-password"]):
            print(f"EMAIL SEND SIMULATION | Demo credentials detected for {from_address}. Using simulated delivery.")
            return EmailService.simulate_send(to_address, subject, body, cc=cc, bcc=bcc, attachments=attachments)

        print(f"EMAIL SEND START | Provider: Custom SMTP | Auth Type: SMTP Credentials | From: {from_address} | To: {to_address} | Sending Method: SMTP")
        try:
            msg = MIMEMultipart("mixed")
            msg["Subject"] = subject
            msg["From"] = from_address
            msg["To"] = to_address
            import email.utils
            msg["Date"] = email.utils.formatdate(localtime=True)
            domain = from_address.split("@")[-1] if "@" in from_address else "mail.domain"
            msg["Message-ID"] = f"<{int(datetime.utcnow().timestamp())}.{os.urandom(6).hex()}@{domain}>"

            recipients = [to_address]
            if cc:
                cc_str = ", ".join(cc) if isinstance(cc, list) else str(cc)
                if cc_str.strip():
                    msg["Cc"] = cc_str.strip()
                    recipients.extend([addr.strip() for addr in cc_str.split(",") if addr.strip()])
            if bcc:
                bcc_str = ", ".join(bcc) if isinstance(bcc, list) else str(bcc)
                if bcc_str.strip():
                    msg["Bcc"] = bcc_str.strip()
                    recipients.extend([addr.strip() for addr in bcc_str.split(",") if addr.strip()])

            alt_part = MIMEMultipart("alternative")
            if "<p>" in body or "<br>" in body or "<div>" in body or "<span>" in body:
                plain_text = re.sub(r'<[^>]+>', '', body)
                part_text = MIMEText(plain_text, "plain", "utf-8")
                part_html = MIMEText(f"<html><body>{body}</body></html>", "html", "utf-8")
            else:
                part_text = MIMEText(body, "plain", "utf-8")
                html_body = body.replace("\n", "<br>")
                part_html = MIMEText(f"<html><head><meta charset=\"utf-8\"></head><body style=\"font-family: Arial, sans-serif; font-size: 14px; color: #222222; line-height: 1.5;\"><p>{html_body}</p></body></html>", "html", "utf-8")

            alt_part.attach(part_text)
            alt_part.attach(part_html)
            msg.attach(alt_part)

            # Attach default corporate overview PDF attachment
            attach_default_banner(msg, attachments)

            # Attach user-specified attachments
            attach_user_files(msg, attachments)

            # Pre-send MIME structure verification
            mime_filenames = [p.get_filename() for p in msg.walk() if p.get_filename()]
            print(f"[MIME OUTGOING VERIFICATION] SMTP payload ready with {len(mime_filenames)} attachment(s): {mime_filenames}")

            context = ssl.create_default_context()
            if use_tls:
                with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                    server.starttls(context=context)
                    server.login(username, password)
                    try:
                        server.send_message(msg, from_addr=from_address, to_addrs=recipients)
                    except Exception:
                        server.sendmail(from_address, recipients, msg.as_bytes())
            else:
                with smtplib.SMTP_SSL(smtp_host, smtp_port, context=context, timeout=15) as server:
                    server.login(username, password)
                    try:
                        server.send_message(msg, from_addr=from_address, to_addrs=recipients)
                    except Exception:
                        server.sendmail(from_address, recipients, msg.as_bytes())

            return {
                "success": True,
                "sending_method": "SMTP",
                "message_id": msg["Message-ID"],
                "attachments": mime_filenames,
                "sent_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {"success": False, "sending_method": "SMTP", "error": str(e)}

    @staticmethod
    def send_mailbox_email(
        mailbox: Mailbox,
        to_address: str,
        subject: str,
        body: str,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[Any]] = None,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """Main Transport Entrypoint for sending email via a connected Mailbox."""
        auth_type = (mailbox.auth_type or "smtp_credentials").lower()
        provider = (mailbox.provider or "smtp").lower()

        if auth_type == "oauth2" or provider == "gmail":
            return EmailService.send_via_gmail_api(
                mailbox=mailbox,
                to_address=to_address,
                subject=subject,
                body=body,
                cc=cc,
                bcc=bcc,
                attachments=attachments,
                db=db
            )
        
        return EmailService.send_email(
            smtp_host=mailbox.host,
            smtp_port=mailbox.port,
            username=mailbox.username,
            password=mailbox.password,
            from_address=mailbox.from_address,
            to_address=to_address,
            subject=subject,
            body=body,
            cc=cc,
            bcc=bcc,
            attachments=attachments
        )

    @staticmethod
    def simulate_send(
        to_address: str,
        subject: str,
        body: str,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[Any]] = None
    ) -> Dict[str, Any]:
        import hashlib
        msg_id = f"<sim-{hashlib.md5((subject + to_address).encode()).hexdigest()[:12]}@openoutreach-sim>"
        att_summary = ["Corporate_Capabilities_Overview.pdf"]
        if attachments:
            for a in attachments:
                if isinstance(a, dict):
                    fn = a.get("filename") or "file"
                elif isinstance(a, str):
                    fn = os.path.basename(a)
                else:
                    continue
                if fn and fn != "Corporate_Capabilities_Overview.pdf":
                    att_summary.append(fn)

        return {
            "success": True,
            "simulated": True,
            "sending_method": "Simulated",
            "message_id": msg_id,
            "to": to_address,
            "cc": cc or [],
            "bcc": bcc or [],
            "subject": subject,
            "body": body,
            "attachments": att_summary,
            "sent_at": datetime.utcnow().isoformat(),
        }


    @staticmethod
    def clean_reply_body(raw_body: str) -> str:
        """Strips quoted original email text (lines starting with '>' or 'On ... wrote:') to extract the prospect's actual new reply text."""
        import re
        if not raw_body:
            return "Reply received."
        
        lines = raw_body.splitlines()
        reply_lines = []
        for line in lines:
            stripped = line.strip()
            if stripped.startswith(">"):
                continue
            if re.match(r'^On\s+.*wrote:$', stripped, re.IGNORECASE):
                break
            if re.match(r'^-+Original Message-+$', stripped, re.IGNORECASE):
                break
            if re.match(r'^From:.*', stripped, re.IGNORECASE):
                break
            reply_lines.append(line)

        clean_text = "\n".join(reply_lines).strip()
        return clean_text if clean_text else raw_body.strip()

    @staticmethod
    def check_imap_replies(mailbox: Mailbox, target_email: Optional[str] = None, target_subject: Optional[str] = None, sent_after=None) -> list:
        """Connects via IMAP SSL (imap.gmail.com:993) and fetches real incoming email replies."""
        import imaplib
        import email
        from email.header import decode_header
        from email.utils import parsedate_to_datetime

        if not mailbox or not mailbox.username or not mailbox.password:
            return []

        # Fast check for demo/dummy credentials to avoid 10s network connection timeouts
        usr_lower = mailbox.username.lower()
        pwd_lower = mailbox.password.lower()
        if any(dummy_word in usr_lower or dummy_word in pwd_lower for dummy_word in ["demo", "example", "placeholder", "test", "app-password"]):
            return []

        replies = []
        try:
            imap_host = mailbox.imap_host or "imap.gmail.com"
            imap_port = mailbox.imap_port or 993

            mail = imaplib.IMAP4_SSL(imap_host, imap_port, timeout=10)
            mail.login(mailbox.username, mailbox.password)
            mail.select("INBOX")

            if target_email:
                # Build IMAP search — if sent_after is given, only look at emails received AFTER that date
                if sent_after:
                    # IMAP SINCE uses day granularity, subtract 1 day to be safe, then we'll do precise filtering
                    from datetime import timedelta
                    since_date = (sent_after - timedelta(days=1)).strftime("%d-%b-%Y")
                    search_criterion = f'(FROM "{target_email.strip()}" SINCE "{since_date}")'
                else:
                    search_criterion = f'FROM "{target_email.strip()}"'
                status, messages = mail.search(None, search_criterion)
                if status != "OK" or not messages[0] or not messages[0].strip():
                    print(f"[IMAP SEARCH FALLBACK] Criterion '{search_criterion}' returned 0 messages. Fallback to recent INBOX messages...")
                    status, messages = mail.search(None, "ALL")

                if status != "OK" or not messages[0] or not messages[0].strip():
                    mail.logout()
                    return {"success": True, "replies": [], "error": None, "connection_error": False}
            else:
                mail.logout()
                return {"success": True, "replies": [], "error": None, "connection_error": False}

            if status == "OK" and messages[0]:
                email_ids = messages[0].split()
                recent_ids = email_ids[-10:]
                for e_id in reversed(recent_ids):
                    res, msg_data = mail.fetch(e_id, "(RFC822)")
                    if res != "OK":
                        continue
                    for response_part in msg_data:
                        if isinstance(response_part, tuple):
                            msg = email.message_from_bytes(response_part[1])
                            
                            # Decode subject
                            sub_parts = decode_header(msg.get("Subject", ""))
                            subj = ""
                            for p, enc in sub_parts:
                                if isinstance(p, bytes):
                                    subj += p.decode(enc or "utf-8", errors="ignore")
                                else:
                                    subj += str(p)

                            # Decode From
                            from_parts = decode_header(msg.get("From", ""))
                            from_addr = ""
                            for p, enc in from_parts:
                                if isinstance(p, bytes):
                                    from_addr += p.decode(enc or "utf-8", errors="ignore")
                                else:
                                    from_addr += str(p)

                            # Extract clean sender email address
                            clean_from = from_addr.lower()
                            if "<" in clean_from and ">" in clean_from:
                                sender_email = clean_from.split("<")[1].split(">")[0].strip()
                            else:
                                sender_email = clean_from.strip()

                            # STRICT SENDER CHECK: Ignore self-sent emails from the outreach sender mailbox
                            mb_from_raw = (mailbox.from_address or "").strip().lower()
                            if "<" in mb_from_raw and ">" in mb_from_raw:
                                mb_from_clean = mb_from_raw.split("<")[1].split(">")[0].strip()
                            else:
                                mb_from_clean = mb_from_raw
                            mb_user_clean = (mailbox.username or "").strip().lower()
                            if sender_email == mb_from_clean or sender_email == mb_user_clean:
                                continue

                            # STRICT SENDER CHECK: Must match target_email exactly
                            if target_email:
                                target_clean = target_email.lower().strip()
                                if sender_email != target_clean:
                                    continue

                            # SUBJECT THREAD VALIDATION: Must match target campaign subject if provided
                            if target_subject:
                                def normalize_sub(s: str) -> str:
                                    s_clean = re.sub(r'^(re|fwd|fw):\s*', '', (s or "").strip(), flags=re.IGNORECASE)
                                    return re.sub(r'[^a-zA-Z0-9\s]', '', s_clean).lower().strip()

                                norm_target = normalize_sub(target_subject)
                                norm_msg = normalize_sub(subj)
                                target_words = set(w for w in norm_target.split() if len(w) > 2)
                                msg_words = set(w for w in norm_msg.split() if len(w) > 2)

                                if target_words:
                                    common = target_words.intersection(msg_words)
                                    if not common and norm_target not in norm_msg and norm_msg not in norm_target:
                                        print(f"[IMAP FILTER] Discarding email with subject '{subj}' — does not match target campaign subject '{target_subject}'")
                                        continue

                            # DATE FILTER: Skip emails received BEFORE the campaign email was sent
                            if sent_after:
                                raw_date_str = msg.get("Date", "")
                                try:
                                    from email.utils import parsedate_to_datetime
                                    msg_dt = parsedate_to_datetime(raw_date_str)
                                    # Make sent_after timezone-aware for comparison
                                    from datetime import timezone
                                    sent_after_aware = sent_after.replace(tzinfo=timezone.utc) if sent_after.tzinfo is None else sent_after
                                    if msg_dt < sent_after_aware:
                                        print(f"[IMAP FILTER] Skipping old email from {sender_email} dated {raw_date_str} (before campaign send at {sent_after})")
                                        continue
                                except Exception:
                                    pass  # If we can't parse date, allow it through

                            # Extract plain text body
                            body = ""
                            if msg.is_multipart():
                                for part in msg.walk():
                                    if part.get_content_type() == "text/plain":
                                        b_payload = part.get_payload(decode=True)
                                        if b_payload:
                                            body = b_payload.decode("utf-8", errors="ignore")
                                        break
                            else:
                                b_payload = msg.get_payload(decode=True)
                                if b_payload:
                                    body = b_payload.decode("utf-8", errors="ignore")

                            clean_body = EmailService.clean_reply_body(body)
                            replies.append({
                                "from": from_addr,
                                "subject": subj,
                                "body": clean_body,
                                "raw_body": body.strip(),
                                "date": msg.get("Date")
                            })
            mail.logout()
        except Exception as err:
            print(f"[IMAP NOTICE] IMAP sync for mailbox #{mailbox.id} ({mailbox.from_address}): {err}")

        return replies


email_service = EmailService()

