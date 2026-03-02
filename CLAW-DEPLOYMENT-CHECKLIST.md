# Claw Customer Service - Deployment Checklist

Use this checklist to ensure your Claw Customer Service deployment is production-ready.

## ✅ Pre-Deployment

### Code Quality
- [ ] All TypeScript compiles without errors: `npm run build`
- [ ] No linting errors: `npm run lint`
- [ ] All tests pass: `npm test`
- [ ] Code follows formatting standards: `npm run format`
- [ ] No security vulnerabilities: `npm audit`
- [ ] Git history is clean: `git log --oneline | head -20`

### Configuration
- [ ] `.env` file created and filled with all required variables
- [ ] `.env` is in `.gitignore` (never commit secrets)
- [ ] Backup of old `.env` created (`.env.bak`)
- [ ] All API keys are valid and have proper permissions
- [ ] `GOOGLE_SHEET_ID` points to valid, accessible Google Sheet
- [ ] Google OAuth credentials are correct
- [ ] Twilio credentials are correct (if phone enabled)
- [ ] LLM provider credentials work (test with simple request)

### Database
- [ ] SQLite database initialized: `npm run db:init`
- [ ] Database schema verified: Check `claw-learning.db` exists
- [ ] Backup of production database created
- [ ] Retention policy configured (`DATA_RETENTION_DAYS`)
- [ ] Performance indexes created

### Google Integration
- [ ] Gmail API enabled in Google Cloud Console
- [ ] Google Sheets API enabled
- [ ] OAuth 2.0 credentials created (Desktop Application)
- [ ] Redirect URL registered: `https://yourdomain.com/auth/callback`
- [ ] Google Sheet has correct format (Category, Question, Answer, Keywords)
- [ ] Test: Can read from Google Sheets via API

### Twilio Integration (if phone enabled)
- [ ] Twilio account created and verified
- [ ] Phone number purchased and configured
- [ ] Webhook URLs set in Twilio Console:
  - [ ] `https://yourdomain.com/api/phone/incoming`
  - [ ] `https://yourdomain.com/api/phone/status`
- [ ] Test: Incoming call generates TwiML response
- [ ] Test: Response generation works for sample input

### LLM Setup
- [ ] Primary LLM provider tested and working
- [ ] Fallback LLM provider configured (if applicable)
- [ ] API keys are valid and have quota
- [ ] Response generation tested with sample prompts
- [ ] Cost tracking enabled (if using paid APIs)
- [ ] Rate limits understood and configured

## ✅ Docker Deployment

### Image Build
- [ ] Dockerfile builds without errors: `docker build -f CLAW-DOCKERFILE -t claw-cs:latest .`
- [ ] Dockerfile includes health check
- [ ] Build uses minimal base image
- [ ] No secrets embedded in image
- [ ] Image scanned for vulnerabilities: `docker scan claw-cs:latest`

### Compose Configuration
- [ ] `docker-compose.yml` is valid: `docker-compose config`
- [ ] All environment variables mapped from `.env`
- [ ] Volume mounts are correct (data persistence)
- [ ] Network configuration is correct
- [ ] Port mappings are correct
- [ ] Ollama service configured (if using local LLM)
- [ ] Restart policies set appropriately

### Local Testing
- [ ] `docker-compose up` starts successfully
- [ ] Health endpoint responds: `curl http://localhost:3000/health`
- [ ] All services show "ready" status
- [ ] Logs show no errors: `docker-compose logs`
- [ ] Email service can access Google APIs
- [ ] Phone service responds to test calls
- [ ] Database initialized correctly in container
- [ ] Knowledge base loads from Google Sheets
- [ ] Clean shutdown: `docker-compose down`

### Production Readiness
- [ ] Image pushed to Docker Hub: `docker push bobclaw26/claw-customer-service:latest`
- [ ] Image tagged with version: `docker tag ... :v1.0.0`
- [ ] Backup strategy defined for data volumes
- [ ] Update strategy documented

## ✅ VPS Deployment (Ubuntu)

### Server Setup
- [ ] SSH access working
- [ ] Server is Ubuntu 22.04 LTE+
- [ ] System updated: `sudo apt update && apt upgrade`
- [ ] Firewall configured: `sudo ufw enable`
- [ ] Ports opened: 22 (SSH), 80 (HTTP), 443 (HTTPS), 3000 (app)
- [ ] Swap configured (at least 2GB)

### Node.js Installation
- [ ] Node.js v20+ installed: `node --version`
- [ ] npm v9+ installed: `npm --version`
- [ ] SQLite3 installed: `sqlite3 --version`
- [ ] Git installed: `git --version`
- [ ] Build tools installed: `gcc`, `make`, `python3`

### Application Setup
- [ ] Code cloned/copied to `/opt/claw-customer-service`
- [ ] `.env` file created and configured
- [ ] Ownership set correctly: `sudo chown -R www-data:www-data /opt/claw-customer-service`
- [ ] Dependencies installed: `npm install`
- [ ] Application built: `npm run build`
- [ ] Database initialized: `npm run db:init`

### Systemd Service
- [ ] Service file created: `/etc/systemd/system/claw-customer-service.service`
- [ ] Service file has correct permissions: `chmod 644`
- [ ] Service loads: `sudo systemctl daemon-reload`
- [ ] Service starts: `sudo systemctl start claw-customer-service`
- [ ] Service enabled: `sudo systemctl enable claw-customer-service`
- [ ] Service status shows running: `sudo systemctl status claw-customer-service`
- [ ] Logs are accessible: `sudo journalctl -u claw-customer-service`

### Reverse Proxy (Nginx)
- [ ] Nginx installed: `sudo apt install nginx`
- [ ] Config created: `/etc/nginx/sites-available/claw`
- [ ] Config linked: `/etc/nginx/sites-enabled/claw`
- [ ] Default site disabled: `sudo rm /etc/nginx/sites-enabled/default`
- [ ] Config tested: `sudo nginx -t`
- [ ] Nginx started: `sudo systemctl start nginx`
- [ ] Nginx enabled: `sudo systemctl enable nginx`

### HTTPS/SSL
- [ ] Certbot installed: `sudo apt install certbot python3-certbot-nginx`
- [ ] SSL certificate obtained: `sudo certbot certonly --nginx -d yourdomain.com`
- [ ] Nginx config updated for HTTPS
- [ ] SSL auto-renewal configured: `sudo systemctl status certbot.timer`
- [ ] HTTP redirects to HTTPS
- [ ] SSL certificate valid: Test with `https://yourdomain.com/health`

### VPS Testing
- [ ] Application accessible: `curl https://yourdomain.com/health`
- [ ] All services ready: Check JSON response
- [ ] Email service working: Test draft generation
- [ ] Phone service working: Test webhook response
- [ ] Logs are clean: `sudo journalctl -u claw-customer-service -f`
- [ ] Performance acceptable: Monitor with `top` or `htop`

## ✅ Data & Security

### Data Protection
- [ ] Database backup strategy implemented
- [ ] Backups tested (restore to test environment)
- [ ] Backup automation configured (daily)
- [ ] Backups stored securely (encrypted, off-server)
- [ ] Retention policy configured

### Secrets Management
- [ ] All API keys in `.env`, NOT in code
- [ ] `.env` permissions restricted: `chmod 600 .env`
- [ ] `.env` backed up securely (separate from code)
- [ ] No secrets in logs or error messages
- [ ] Secret rotation scheduled (quarterly minimum)
- [ ] Environment variables never logged

### Encryption
- [ ] TLS/HTTPS enabled in production
- [ ] Strong SSL certificate (not self-signed)
- [ ] Security headers configured (HSTS, CSP, etc)
- [ ] Sensitive data encrypted at rest (if applicable)
- [ ] API keys never logged or exposed
- [ ] Database backups encrypted

### Access Control
- [ ] Google OAuth properly configured
- [ ] Only authorized users can access dashboard
- [ ] Role-based access control working (admin, approver, viewer)
- [ ] No hardcoded credentials
- [ ] SSH key authentication only (no passwords)
- [ ] Regular access reviews scheduled

## ✅ Monitoring & Logging

### Application Monitoring
- [ ] Health check endpoint monitored: `curl http://localhost:3000/health`
- [ ] CPU usage monitored (should be <50% baseline)
- [ ] Memory usage monitored (should be <500MB)
- [ ] Disk usage monitored
- [ ] Uptime monitored (99.5% target)
- [ ] Response time monitored (<2s email, <5s phone)

### Logging Configuration
- [ ] Log level set appropriately (info in production)
- [ ] Logs are structured (JSON format)
- [ ] Sensitive data NOT logged (API keys, tokens)
- [ ] Log rotation configured (prevent disk full)
- [ ] Old logs archived or deleted
- [ ] Central log aggregation (optional: ELK, Splunk, etc)

### Alerting
- [ ] Service down alert configured
- [ ] Error rate alert configured
- [ ] Response time alert configured
- [ ] Disk space alert configured
- [ ] Database size alert configured
- [ ] Alert recipients configured
- [ ] Test alerts working

### Audit Logging
- [ ] Audit log enabled and working
- [ ] All user actions logged
- [ ] Timestamp and user ID logged
- [ ] Changes to KB logged
- [ ] Approvals/rejections logged
- [ ] Settings changes logged
- [ ] Audit log retention policy configured

## ✅ Testing & Validation

### Functional Testing
- [ ] Email draft generation works
- [ ] Email approval/rejection works
- [ ] Email sending works
- [ ] Phone incoming call handled
- [ ] Phone response generation works
- [ ] Knowledge base searches work
- [ ] Learning metrics calculated correctly
- [ ] Dashboard loads and displays data

### Integration Testing
- [ ] End-to-end email workflow tested
- [ ] End-to-end phone workflow tested
- [ ] Learning feedback integration tested
- [ ] Google Sheets sync tested
- [ ] Fallback LLM tested
- [ ] Rate limiting tested
- [ ] Error handling tested

### Load Testing
- [ ] 100 concurrent users tested
- [ ] Response time under load acceptable
- [ ] No memory leaks detected
- [ ] Database handles concurrent queries
- [ ] Rate limiting prevents abuse
- [ ] System recovers after load

### Security Testing
- [ ] Prompt injection attempts blocked
- [ ] SQL injection attempts blocked
- [ ] Rate limiting working
- [ ] Invalid auth rejected
- [ ] CSRF protection enabled (if applicable)
- [ ] XSS protection enabled
- [ ] CORS properly configured

## ✅ Documentation & Runbooks

### Setup Documentation
- [ ] README.md complete and accurate
- [ ] SETUP.md covers all deployment options
- [ ] ARCHITECTURE.md explains system design
- [ ] API.md documents all endpoints
- [ ] Configuration options documented
- [ ] Example `.env` file provided

### Operational Documentation
- [ ] Troubleshooting guide created
- [ ] Common issues and solutions documented
- [ ] Performance tuning guide created
- [ ] Backup/restore procedures documented
- [ ] Scaling procedures documented
- [ ] Emergency procedures documented

### Runbooks
- [ ] Service restart procedure documented
- [ ] Database restore procedure documented
- [ ] Secret rotation procedure documented
- [ ] Emergency rollback procedure documented
- [ ] Scaling up/down procedure documented
- [ ] Incident response procedure documented

## ✅ Final Checks

### Before Going Live
- [ ] Stakeholders notified of deployment
- [ ] Maintenance window scheduled (if needed)
- [ ] Rollback plan documented and tested
- [ ] Team trained on new system
- [ ] Documentation complete and accessible
- [ ] Support contacts configured
- [ ] Monitoring and alerting working
- [ ] Database backed up

### Post-Deployment
- [ ] All services accessible and responsive
- [ ] Email workflows tested with real emails
- [ ] Phone workflows tested with real calls
- [ ] Learning metrics showing data
- [ ] No errors in logs
- [ ] Performance metrics acceptable
- [ ] All features working as expected
- [ ] Team trained and ready

### Continuous Monitoring
- [ ] Daily health checks
- [ ] Weekly performance review
- [ ] Monthly security audit
- [ ] Quarterly dependency updates
- [ ] Quarterly secret rotation
- [ ] Regular backup verification
- [ ] Quarterly disaster recovery test

## 📋 Sign-Off

**Deployment Date:** ________________

**Deployed By:** ________________

**Reviewed By:** ________________

**Approved By:** ________________

**Notes:**
```
___________________________________________________________________

___________________________________________________________________

___________________________________________________________________
```

---

✅ All checks completed? You're ready for production!

**Emergency Contact:** ________________

**Escalation Contact:** ________________

**Support Email:** ________________
