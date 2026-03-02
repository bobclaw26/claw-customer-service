# 🚀 Claw Customer Service - Quick Reference Guide

## Start Here

### First Time Setup
```bash
# 1. Copy template
cp .env.example .env

# 2. Run setup wizard
bash setup.sh

# 3. Start application
docker-compose up -d

# 4. Open browser
# http://localhost:3000
```

## Command Cheat Sheet

### Docker
```bash
docker-compose up -d        # Start all services
docker-compose down         # Stop all services
docker-compose logs -f      # View logs
docker-compose restart      # Restart services
docker-compose ps           # See running containers
```

### Development
```bash
npm install                 # Install backend deps
cd client && npm install    # Install frontend deps
npm start                   # Start backend
cd client && npm start      # Start frontend (separate terminal)
make dev                    # Start both with Make
```

### Database
```bash
sqlite3 data/claw.db        # Open database
.tables                     # List tables
SELECT * FROM users;        # Query example
.quit                       # Exit
```

### Deployment
```bash
make build                  # Build frontend
docker build -t claw .      # Build Docker image
docker-compose up -d        # Deploy
make backup                 # Backup database
```

## API Quick Reference

### Authentication
```bash
# Get OAuth URL
curl http://localhost:5000/api/auth/oauth-url

# Callback (handled by frontend)
POST /api/auth/oauth-callback { code }

# Verify token
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/auth/verify
```

### Email
```bash
# Get pending emails
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/email/interactions?status=pending

# Generate draft
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"emailId":"id","knowledgeBase":"content"}' \
  http://localhost:5000/api/email/draft-response

# Approve and send
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"emailId":"id","response":"text"}' \
  http://localhost:5000/api/email/approve-send
```

### Knowledge Base
```bash
# List entries
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/kb/entries

# Search
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:5000/api/kb/search?q=refund"

# Sync from Google Sheet
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sheetId":"SHEET_ID"}' \
  http://localhost:5000/api/kb/sync-sheet
```

### Dashboard & Metrics
```bash
# Get metrics
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/dashboard/metrics

# Get performance data
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/dashboard/performance
```

### Audit Log
```bash
# View audit log
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:5000/api/audit/log?days=30"

# Export as CSV
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:5000/api/audit/export?format=csv" \
  > audit.csv
```

## Environment Variables

### Required
```bash
GOOGLE_CLIENT_ID          # From Google Cloud Console
GOOGLE_CLIENT_SECRET      # From Google Cloud Console
JWT_SECRET                # Random string (openssl rand -hex 32)
LLM_PROVIDER              # openai, claude, or ollama
```

### Optional
```bash
NODE_ENV                  # development or production
PORT                      # Default 5000
DATABASE_PATH             # Default ./data/claw.db
LLM_API_KEY              # For OpenAI/Claude
LLM_MODEL                # gpt-3.5-turbo, claude-3-sonnet, etc
OLLAMA_URL               # For local LLM
TWILIO_ACCOUNT_SID       # For phone support
TWILIO_AUTH_TOKEN        # For phone support
TWILIO_PHONE_NUMBER      # For phone support
```

## Database Tables

### Users
```sql
SELECT * FROM users;
-- Fields: id, email, name, oauth_id, role, created_at
```

### Email Interactions
```sql
SELECT * FROM email_interactions 
WHERE status = 'pending';
-- Fields: id, from_email, subject, body, draft_response, status, approved_by, approved_at
```

### Phone Interactions
```sql
SELECT * FROM phone_interactions;
-- Fields: id, phone_number, transcript, status, twilio_call_sid, created_at
```

### Knowledge Base
```sql
SELECT * FROM knowledge_base;
-- Fields: id, category, title, content, tags, is_faq, created_at
```

### Audit Log
```sql
SELECT * FROM audit_log;
-- Fields: id, user_id, action, resource_type, resource_id, created_at
```

## Common Tasks

### Reset Database
```bash
rm -f data/claw.db
docker-compose restart app
```

### View Logs in Real-time
```bash
docker-compose logs -f app
docker-compose logs -f ollama  # If using local LLM
```

### Backup Database
```bash
cp data/claw.db backups/claw-$(date +%Y%m%d).db
```

### Test LLM
```bash
# If using Ollama
curl http://localhost:11434/api/generate -d '{
  "model": "mistral",
  "prompt": "Hello",
  "stream": false
}'

# If using OpenAI
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hi"}]
  }'
```

### Monitor Performance
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s \
  -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/dashboard/metrics

# See resource usage
docker stats claw_app_1

# Check database size
ls -lh data/claw.db
```

## Troubleshooting

### Can't connect to Docker
```bash
docker ps           # Is Docker running?
docker-compose ps   # Are services up?
docker-compose logs # Check logs
```

### API returning 401 Unauthorized
- Check token is in Authorization header
- Token format: `Bearer YOUR_TOKEN`
- Token might be expired (7 days)

### LLM not responding
```bash
# Test local LLM
curl http://localhost:11434/api/generate

# Test API
curl -H "Authorization: Bearer KEY" \
  https://api.openai.com/v1/models
```

### Database locked
```bash
# Check for locks
lsof | grep claw.db

# Restart app
docker-compose restart app
```

### Port already in use
```bash
# Change port in docker-compose.yml
# ports:
#   - "5001:5000"  # Changed from 5000

# Or kill process using port
lsof -i :5000
kill -9 PID
```

## Performance Tips

1. **Optimize LLM**
   - Use faster model for emails (gpt-3.5-turbo)
   - Use faster model for phone (text-davinci-003)

2. **Cache KB Results**
   - Add Redis for KB caching
   - Reduces Sheets API calls

3. **Async Processing**
   - Use task queue for long-running tasks
   - Keep response times under 2 seconds

4. **Database Optimization**
   - Add indexes on common queries
   - Archive old interactions

## Security Reminders

- ✅ Never commit `.env` file
- ✅ Change JWT_SECRET in production
- ✅ Use strong passwords
- ✅ Enable HTTPS
- ✅ Rotate credentials regularly
- ✅ Review audit log weekly
- ✅ Keep dependencies updated

## Useful Links

- **Google Cloud Console:** https://console.cloud.google.com/
- **Twilio Dashboard:** https://console.twilio.com/
- **OpenAI API:** https://platform.openai.com/
- **Claude API:** https://console.anthropic.com/
- **Ollama Models:** https://ollama.ai/library
- **Docker Hub:** https://hub.docker.com/
- **GitHub Releases:** https://github.com/yourusername/claw-customer-service/releases

## Support Resources

- **Documentation:** README.md
- **Setup Guide:** SETUP_GUIDE.md
- **Deployment:** DEPLOYMENT_CHECKLIST.md
- **API Reference:** README.md#api-endpoints
- **Architecture:** PROJECT_SUMMARY.md

## Version Info

```bash
node --version          # Check Node.js version
npm --version           # Check npm version
docker --version        # Check Docker version
docker-compose --version # Check Docker Compose version
```

---

**Last Updated:** March 2, 2026  
**Version:** 1.0.0
