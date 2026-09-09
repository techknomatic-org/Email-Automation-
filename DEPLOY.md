# 🚀 OpenOutreach AI — Production Deployment Guide (`DEPLOY.md`)

This guide provides complete, step-by-step instructions for deploying **OpenOutreach AI** to production environments (Cloud VMs, AWS EC2, DigitalOcean, Hetzner, GCP, or on-premise servers).

---

## 📑 Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites & System Requirements](#2-prerequisites--system-requirements)
3. [Environment Configuration (`.env`)](#3-environment-configuration-env)
4. [Deployment Option A: Docker Compose (Recommended)](#4-deployment-option-a-docker-compose-recommended)
5. [Deployment Option B: Bare Metal / Systemd (Ubuntu/Debian)](#5-deployment-option-b-bare-metal--systemd-ubuntudebian)
6. [SSL / HTTPS & Domain Setup (Nginx + Certbot)](#6-ssl--https--domain-setup-nginx--certbot)
7. [Database Setup, Migrations & Backups](#7-database-setup-migrations--backups)
8. [CI/CD Automated Deployment (GitHub Actions)](#8-cicd-automated-deployment-github-actions)
9. [Maintenance, Logs & Health Monitoring](#9-maintenance-logs--health-monitoring)

---

## 1. Architecture Overview

```
                      ┌─────────────────────────────────┐
                      │    Internet / User Browser      │
                      └────────────────┬────────────────┘
                                       │ HTTPS (Port 443)
                                       ▼
                      ┌─────────────────────────────────┐
                      │    Nginx Reverse Proxy / SSL    │
                      └────────┬───────────────┬────────┘
                               │               │
            Static SPA (/dist) │               │ API Proxy (/api/*)
                               ▼               ▼
                   ┌──────────────────┐  ┌──────────────────────────┐
                   │  React 18 + Vite │  │   FastAPI Python Backend │
                   │  (Nginx Server)  │  │   (Uvicorn on Port 8000) │
                   └──────────────────┘  └─────────────┬────────────┘
                                                       │
                                 ┌─────────────────────┼─────────────────────┐
                                 │                     │                     │
                                 ▼                     ▼                     ▼
                        ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
                        │  PostgreSQL 18  │   │  OpenRouter /   │   │  Gmail App Pass │
                        │  + pgvector     │   │  LLM Engine     │   │  SMTP / IMAP    │
                        └─────────────────┘   └─────────────────┘   └─────────────────┘
```

---

## 2. Prerequisites & System Requirements

### Hardware Requirements
- **CPU**: 2+ vCPUs (4 vCPUs recommended for high-volume lead discovery)
- **RAM**: 4 GB RAM minimum (8 GB recommended)
- **Disk**: 20 GB+ SSD storage
- **OS**: Ubuntu 22.04 LTS / 24.04 LTS, Debian 12, or Amazon Linux 2023

### Software Requirements
- **Docker**: Engine 24.0+ & Docker Compose v2.20+
- **Git**: 2.30+
- **Domain Name**: Pointed to your server's Public IPv4 address (`A` record)
- **Ports Open**: `80` (HTTP), `443` (HTTPS), `587` (SMTP Outbound), `993` (IMAP Inbound)

---

## 3. Environment Configuration (`.env`)

Create your root `.env` file from `.env.example`:

```bash
cp .env.example .env
nano .env
```

### Essential Production `.env` Variables:

```env
# ── Application Environment ──────────────────────────────────────────────────
ENVIRONMENT=production
SECRET_KEY=generate_a_secure_64_character_random_hex_string_here
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# ── Database (PostgreSQL with pgvector) ───────────────────────────────────────
DB_HOST=db
DB_PORT=5432
DB_NAME=openoutreach
DB_USER=postgres
DB_PASSWORD=YOUR_STRONG_POSTGRES_PASSWORD
DATABASE_URL=postgresql+psycopg://postgres:YOUR_STRONG_POSTGRES_PASSWORD@db:5432/openoutreach

# ── AI Model & OpenRouter Engine ─────────────────────────────────────────────
AI_API_KEY=sk-or-v1-your_openrouter_or_openai_api_key_here
AI_MODEL=openai/gpt-4o-mini
AI_API_BASE=https://openrouter.ai/api/v1

# ── Lead Discovery & Search ──────────────────────────────────────────────────
LEAD_DISCOVERY_PROVIDER=web_search
WEB_SEARCH_API_KEY=your_optional_serp_key_if_used

# ── Mailbox & SMTP/IMAP Delivery ─────────────────────────────────────────────
DEFAULT_SMTP_HOST=smtp.gmail.com
DEFAULT_SMTP_PORT=587
DEFAULT_IMAP_HOST=imap.gmail.com
DEFAULT_IMAP_PORT=993

# ── Global Meeting / Demo Calendar Link ──────────────────────────────────────
GLOBAL_MEETING_LINK=https://meet.google.com/your-org-demo

# ── Frontend & Public URLs ───────────────────────────────────────────────────
FRONTEND_URL=https://outreach.yourdomain.com
VITE_API_BASE_URL=https://outreach.yourdomain.com
```

> [!TIP]
> Generate a secure `SECRET_KEY` in terminal:
> ```bash
> python3 -c "import secrets; print(secrets.token_hex(32))"
> ```

---

## 4. Deployment Option A: Docker Compose (Recommended)

Docker Compose bundles PostgreSQL (with `pgvector`), FastAPI backend, and Nginx frontend in isolated, production-tuned containers.

### Step 1: Clone Repository
```bash
git clone https://github.com/techknomatic-org/Email-Automation-.git /opt/openoutreach
cd /opt/openoutreach
```

### Step 2: Configure Environment
```bash
cp .env.example .env
# Edit your .env with production passwords and API keys
nano .env
```

### Step 3: Build and Launch Containers
```bash
# Build images with optimizations
docker compose build --no-cache

# Launch containers in detached mode
docker compose up -d
```

### Step 4: Verify Container Status
```bash
docker compose ps
```
Output should show all services healthy:
```
NAME                   IMAGE                    STATUS                  PORTS
openoutreach_db        ankane/pgvector:latest   Up (healthy)            0.0.0.0:5432->5432/tcp
openoutreach_backend   openoutreach-backend     Up (healthy)            0.0.0.0:8000->8000/tcp
openoutreach_frontend  openoutreach-frontend    Up (healthy)            0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

---

## 5. Deployment Option B: Bare Metal / Systemd (Ubuntu/Debian)

If deploying directly to a Linux Virtual Machine without Docker:

### Step 1: System Packages & PostgreSQL 18
```bash
sudo apt update && sudo apt install -y python3-pip python3-venv git nginx curl libpq-dev

# Install PostgreSQL & pgvector extension
sudo apt install -y postgresql postgresql-contrib postgresql-server-dev-all
git clone https://github.com/pgvector/pgvector.git /tmp/pgvector
cd /tmp/pgvector && make && sudo make install

# Configure Database
sudo -u postgres psql -c "CREATE USER openoutreach WITH PASSWORD 'YourStrongPassword';"
sudo -u postgres psql -c "CREATE DATABASE openoutreach OWNER openoutreach;"
sudo -u postgres psql -d openoutreach -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Step 2: Backend Setup
```bash
cd /opt/openoutreach
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 3: Configure Systemd Service for Backend
Create `/etc/systemd/system/openoutreach-backend.service`:
```ini
[Unit]
Description=OpenOutreach FastAPI Backend Daemon
After=network.target postgresql.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/openoutreach
EnvironmentFile=/opt/openoutreach/.env
ExecStart=/opt/openoutreach/.venv/bin/python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --workers 4
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openoutreach-backend
sudo systemctl status openoutreach-backend
```

### Step 4: Build Frontend Assets
```bash
cd /opt/openoutreach/frontend
npm ci
npm run build
```

---

## 6. SSL / HTTPS & Domain Setup (Nginx + Certbot)

### Step 1: Configure Host Nginx
Create `/etc/nginx/sites-available/openoutreach.conf`:

```nginx
server {
    listen 80;
    server_name outreach.yourdomain.com;

    # Redirect all HTTP traffic to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name outreach.yourdomain.com;

    # SSL Certificates (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/outreach.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/outreach.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend Static Files
    root /opt/openoutreach/frontend/dist;
    index index.html;

    # API Proxy to FastAPI Backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
    }

    location /health {
        proxy_pass http://127.0.0.1:8000/health;
        proxy_set_header Host $host;
    }

    # SPA Fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Step 2: Obtain Free SSL Certificate via Let's Encrypt
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d outreach.yourdomain.com
sudo systemctl restart nginx
```

---

## 7. Database Setup, Migrations & Backups

### Database Auto-Migrations
OpenOutreach handles database auto-migrations automatically upon application startup (`init_db()` in `backend/app/core/database.py`).

### Automated Daily PostgreSQL Backups
Set up a daily cron job to back up the database:
```bash
sudo crontab -e
```
Add the following line (runs every day at 02:00 AM):
```cron
0 2 * * * docker exec openoutreach_db pg_dump -U postgres openoutreach | gzip > /opt/backups/openoutreach_$(date +\%F).sql.gz
```

### Manual Database Restore
```bash
gunzip -c /opt/backups/openoutreach_2026-09-09.sql.gz | docker exec -i openoutreach_db psql -U postgres -d openoutreach
```

---

## 8. CI/CD Automated Deployment (GitHub Actions)

The repository includes an automated pipeline in [`.github/workflows/deploy.yml`](file:///.github/workflows/deploy.yml) that triggers on every release tag (`v*`):

```yaml
name: Deploy
on:
  push:
    tags: ["v*"]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Backend Docker image
        uses: docker/build-push-action@v6
        with:
          context: .
          file: ./Dockerfile.backend
          push: false
          tags: ghcr.io/${{ github.repository }}-backend:latest
```

### To trigger a production release:
```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## 9. Maintenance, Logs & Health Monitoring

### Viewing Live Logs
```bash
# View backend API logs
docker compose logs -f backend

# View database query logs
docker compose logs -f db

# View web server access logs
docker compose logs -f frontend
```

### Upgrading to the Latest Version
```bash
cd /opt/openoutreach
git pull origin main
docker compose build --no-cache
docker compose up -d
```

### System Health Endpoint
Test the API health anytime:
```bash
curl -f https://outreach.yourdomain.com/health
```
Response:
```json
{
  "status": "ok",
  "database": "connected",
  "version": "1.0.0"
}
```

---

### 🛡️ Default Superadmin Credentials
Upon initial deployment, you can access the portal at your domain or `http://localhost:5173`:
- **Default Email**: `admin@openoutreach.ai`
- **Default Password**: `Admin123!`

*Remember to register your actual user account and update or deactivate the default admin password in production.*
