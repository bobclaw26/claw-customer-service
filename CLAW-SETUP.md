# Claw Customer Service - Setup Guide

## Overview

Claw Customer Service is an AI-powered customer automation platform that lets non-technical business owners deploy multi-channel customer support in minutes. It handles emails and phone calls automatically, learns from your feedback, and runs on your own infrastructure.

## Quick Start (Docker)

**Prerequisites:**
- Docker & Docker Compose installed
- Google OAuth credentials
- (Optional) Twilio account for phone support

**Step 1: Clone/Setup**

```bash
cd ~/.openclaw/workspace/claw-customer-service
bash setup.sh
```

The interactive script will guide you through:
1. Google OAuth configuration
2. Twilio setup (optional)
3. LLM provider choice (local Ollama or cloud API)
4. Basic settings

**Step 2: Start the service**

```bash
docker-compose up -d
```

**Step 3: Verify it's running**

```bash
curl http://localhost:3000/health
```

You should see:
```json
{
  "status": "ok",
  "services": {
    "email": "ready",
    "phone": "ready",
    "knowledge_base": "ready"
  }
}
```

## Full Configuration

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable APIs:
   - Gmail API
   - Google Sheets API
   - Google People API
4. Create OAuth 2.0 credentials:
   - Type: Desktop application
   - Download the JSON file
5. From the JSON file, extract:
   - `client_id` → `GOOGLE_CLIENT_ID`
   - `client_secret` → `GOOGLE_CLIENT_SECRET`
6. Get your OAuth token:
   - Run: `gcloud auth application-default print-access-token`
   - Paste the full token object as `GOOGLE_OAUTH_TOKEN`

### Knowledge Base (Google Sheet)

1. Create a Google Sheet
2. Add columns: `Category | Question | Answer | Keywords`
3. Copy the spreadsheet ID from the URL
4. Set `GOOGLE_SHEET_ID` in .env

**Example format:**

| Category | Question | Answer | Keywords |
|----------|----------|--------|----------|
| Hours | What are your hours? | We're open 9-5 EST, Monday-Friday | hours, open, availability |
| Returns | How do I return items? | Send us a message with your order ID | returns, refunds, exchange |

### Twilio Setup (Phone Support)

1. Sign up at [Twilio.com](https://www.twilio.com/)
2. Get your:
   - Account SID
   - Auth Token
   - Phone Number
3. Configure webhooks to:
   - **Incoming Calls:** `https://yourserver.com/api/phone/incoming`
   - **Call Status:** `https://yourserver.com/api/phone/status`

### LLM Configuration

**Option 1: Local LLM (Ollama) - Privacy-First**

```bash
# docker-compose handles this automatically
# Just set in .env:
LLM_PRIMARY_PROVIDER=ollama
LLM_PRIMARY_MODEL=llama2
```

**Option 2: Cloud LLM (OpenAI)**

```env
LLM_PRIMARY_PROVIDER=openai
LLM_PRIMARY_MODEL=gpt-3.5-turbo
LLM_PRIMARY_API_KEY=sk-...
```

**Option 3: Cloud LLM (Claude)**

```env
LLM_PRIMARY_PROVIDER=claude
LLM_PRIMARY_MODEL=claude-3-sonnet-20240229
LLM_PRIMARY_API_KEY=sk-ant-...
```

**Fallback Configuration:**

```env
# If primary fails, automatically use fallback
LLM_FALLBACK_PROVIDER=openai
LLM_FALLBACK_MODEL=gpt-3.5-turbo
LLM_FALLBACK_API_KEY=sk-...
```

## Docker Deployment

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f claw

# Rebuild after code changes
docker-compose build --no-cache
docker-compose up -d
```

### Without Ollama (Cloud LLM only)

```bash
docker-compose up -d claw
# (Skips the ollama service)
```

### Restart services

```bash
docker-compose restart claw
docker-compose restart ollama
```

## VPS Deployment (Ubuntu)

### Automatic Setup

```bash
# On Ubuntu 22.04+ VPS as root:
bash setup-vps.sh

# Follow interactive prompts
```

### Manual Setup

```bash
# 1. SSH into VPS
ssh root@your-vps-ip

# 2. Update system
apt-get update && apt-get upgrade -y

# 3. Install dependencies
apt-get install -y nodejs npm sqlite3 build-essential

# 4. Clone application
git clone https://github.com/bobclaw26/claw-customer-service.git
cd claw-customer-service

# 5. Install & build
npm install
npm run build

# 6. Create .env file
cp .env.example .env
# Edit with your configuration
nano .env

# 7. Create systemd service
sudo cp claw-customer-service.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable claw-customer-service
sudo systemctl start claw-customer-service

# 8. Check status
sudo systemctl status claw-customer-service
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### SSL/TLS (Let's Encrypt)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot certonly --nginx -d yourdomain.com
sudo systemctl reload nginx
```

## Dashboard Access

Once running, access the dashboard at:

```
http://localhost:3000/dashboard
```

### Features:

- **Email Queue:** Review and approve/reject drafted emails
- **Phone Logs:** View call transcripts and recordings
- **Knowledge Base:** Manage FAQ and policies
- **Learning Metrics:** Track response quality over time
- **Audit Log:** See all actions for compliance
- **Team Management:** Invite approvers and viewers
- **Settings:** Configure integrations and behavior

## API Endpoints

### Email

- `GET /api/email/drafts` - List pending email drafts
- `GET /api/email/drafts/:draftId` - Get draft details
- `POST /api/email/drafts/:draftId/approve` - Approve with optional edits
- `POST /api/email/drafts/:draftId/reject` - Reject draft
- `POST /api/email/webhook` - Gmail webhook (auto-configured)

### Phone

- `POST /api/phone/incoming` - Receive incoming call
- `POST /api/phone/gather` - Process customer input
- `POST /api/phone/status` - Call status update
- `GET /api/phone/status/:callSid` - Get call details

### Dashboard

- `GET /api/dashboard/metrics` - Learning metrics
- `GET /api/dashboard/interactions` - Recent interactions
- `GET /api/dashboard/interactions/:id` - Interaction details
- `GET /api/dashboard/knowledge-base` - KB entries
- `POST /api/dashboard/knowledge-base` - Add KB entry
- `POST /api/dashboard/knowledge-base/sync` - Sync from Google Sheets

## Monitoring

### Docker

```bash
# Check if containers are running
docker ps

# View container logs
docker logs claw-customer-service
docker logs claw-ollama

# Monitor resource usage
docker stats
```

### VPS (Systemd)

```bash
# Check service status
systemctl status claw-customer-service

# View logs
journalctl -u claw-customer-service -f

# Check if listening on port
netstat -tlnp | grep 3000
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs claw

# Common issues:
# 1. Port 3000 already in use
#    Change PORT in .env

# 2. Missing .env file
#    Copy .env.example to .env and fill in values

# 3. No Ollama model
#    docker-compose exec ollama ollama pull llama2
```

### Gmail webhook not working

```bash
# 1. Verify Google OAuth token is correct
# 2. Check Gmail API is enabled in Google Cloud Console
# 3. Test webhook: curl -X POST http://localhost:3000/api/email/webhook \
#    -H "Content-Type: application/json" \
#    -d '{"message": {"data": "..."}}'
```

### Twilio calls not working

```bash
# 1. Verify webhook URLs in Twilio console
# 2. Check Twilio credentials in .env
# 3. Test: curl http://localhost:3000/api/phone/status/test
```

### Database locked error

```bash
# SQLite lock typically resolves on restart
systemctl restart claw-customer-service

# If persistent, check for zombie processes
ps aux | grep node
# Kill: kill -9 <pid>
```

## Performance Tuning

### Increase concurrency (docker-compose)

```yaml
services:
  claw:
    environment:
      NODE_ENV: production
    # Add more replicas
    deploy:
      replicas: 3
```

### Ollama optimization

```yaml
environment:
  OLLAMA_NUM_PARALLEL: 8      # Parallel requests
  OLLAMA_NUM_THREAD: 16       # CPU threads
```

### Database optimization

```bash
# Run periodic maintenance
docker-compose exec claw npm run db:optimize
```

## Backup & Restore

### Backup database

```bash
# Docker
docker-compose exec claw sqlite3 data/claw-learning.db .dump > backup.sql

# VPS
sqlite3 /opt/claw-customer-service/data/claw-learning.db .dump > backup.sql
```

### Restore database

```bash
# Docker
docker-compose exec -T claw sqlite3 data/claw-learning.db < backup.sql

# VPS
sqlite3 /opt/claw-customer-service/data/claw-learning.db < backup.sql
```

## Security Best Practices

1. **Keep secrets in .env, never in code**
2. **Use strong, unique API keys**
3. **Enable HTTPS/SSL in production**
4. **Use a reverse proxy (Nginx)**
5. **Regular database backups**
6. **Monitor logs for errors**
7. **Keep dependencies updated**: `npm audit fix`
8. **Set DATA_RETENTION_DAYS for compliance**

## Support & Resources

- Documentation: See `/docs`
- Architecture: See `CLAW_CUSTOMER_SERVICE.md`
- Issues: Create GitHub issue
- Community: Join OpenClaw Discord

## Next Steps

1. ✅ Complete basic setup
2. 📧 Test email functionality
3. 📞 Test phone functionality (if enabled)
4. 📊 Monitor metrics in dashboard
5. 🔄 Let system learn from feedback
6. 🚀 Deploy to production VPS
7. 🔐 Set up SSL/HTTPS
8. 📈 Scale as needed

Happy customer service automation! 🦁
