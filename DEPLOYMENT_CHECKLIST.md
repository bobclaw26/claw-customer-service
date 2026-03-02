# 🚀 Production Deployment Checklist

Before deploying Claw to production, ensure all items below are completed.

## Pre-Deployment

- [ ] **Environment Variables**
  - [ ] `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` configured
  - [ ] `JWT_SECRET` changed from default (use `openssl rand -hex 32`)
  - [ ] `NODE_ENV=production`
  - [ ] `LLM_API_KEY` set correctly
  - [ ] All Twilio credentials (if using phone)
  - [ ] No secrets in `.env.example` file

- [ ] **Domain & SSL**
  - [ ] Domain purchased and pointing to server
  - [ ] SSL certificate generated (Let's Encrypt recommended)
  - [ ] HTTPS enforced on all endpoints
  - [ ] Update `GOOGLE_CALLBACK_URL` to production domain
  - [ ] Update `TWILIO_WEBHOOK_URL` to production domain

- [ ] **Security**
  - [ ] Review `.env` file - no hardcoded secrets left
  - [ ] Firewall configured (only allow ports 80, 443)
  - [ ] Rate limiting enabled (default 100 req/15min)
  - [ ] Input sanitization active (XSS protection)
  - [ ] SQL injection prevention (parameterized queries - done)
  - [ ] Prompt injection prevention active

- [ ] **Database**
  - [ ] SQLite configured for persistence
  - [ ] Backup strategy implemented
  - [ ] Data directory has write permissions
  - [ ] Database file has restrictive permissions (600)

- [ ] **LLM Configuration**
  - [ ] LLM provider tested and working
  - [ ] Fallback to API configured if using Ollama
  - [ ] Rate limiting on LLM API calls
  - [ ] Cost estimates reviewed (if using paid API)

- [ ] **Email Integration**
  - [ ] Gmail API enabled and credentials correct
  - [ ] OAuth scopes verified (Gmail, Sheets)
  - [ ] Test email sending works
  - [ ] Gmail webhook configured (if using webhooks)

- [ ] **Phone Integration** (if applicable)
  - [ ] Twilio credentials correct
  - [ ] Twilio phone number active
  - [ ] Webhook URL configured in Twilio dashboard
  - [ ] Test inbound call works
  - [ ] TTS voice configured

- [ ] **Knowledge Base**
  - [ ] Google Sheet created and shared
  - [ ] Sheet columns correct (Category, Title, Content, Tags, FAQ)
  - [ ] Sample data added
  - [ ] Sheet ID tested (sync works)

## Deployment

- [ ] **Docker**
  - [ ] Docker and Docker Compose installed
  - [ ] Docker image built successfully
  - [ ] All environment variables passed to containers
  - [ ] Volumes mounted correctly for database persistence
  - [ ] Health checks configured and passing

- [ ] **Server Setup**
  - [ ] Server OS updated and patched
  - [ ] Docker daemon running
  - [ ] Sufficient disk space (min 5GB)
  - [ ] Sufficient RAM (min 2GB)
  - [ ] Swap space configured
  - [ ] Timezone set correctly

- [ ] **Networking**
  - [ ] Reverse proxy configured (Nginx/Apache)
  - [ ] SSL certificate installed
  - [ ] HTTP redirects to HTTPS
  - [ ] CORS configured correctly
  - [ ] Firewall allows only necessary ports

- [ ] **DNS & CDN** (optional)
  - [ ] DNS records updated
  - [ ] CDN configured for static assets
  - [ ] Caching headers set appropriately

## Post-Deployment

- [ ] **Verification**
  - [ ] Application accessible on production domain
  - [ ] Login works (Google OAuth)
  - [ ] Email approval flow works end-to-end
  - [ ] Phone integration responds to calls
  - [ ] Dashboard displays metrics
  - [ ] Audit log records actions
  - [ ] Knowledge base syncs from Google Sheet

- [ ] **Monitoring**
  - [ ] Uptime monitoring enabled (e.g., Pingdom)
  - [ ] Error logging configured
  - [ ] Resource monitoring active (CPU, memory, disk)
  - [ ] Log rotation configured
  - [ ] Backup automation running

- [ ] **Backup & Recovery**
  - [ ] Daily database backups configured
  - [ ] Backup storage tested
  - [ ] Recovery procedure documented
  - [ ] Backup retention policy set (30+ days)

- [ ] **Performance**
  - [ ] Email draft generation <2s
  - [ ] Phone response generation <5s
  - [ ] Dashboard loads <1s
  - [ ] Database queries optimized
  - [ ] CDN delivering static assets

- [ ] **Security Audit**
  - [ ] Penetration testing completed (or planned)
  - [ ] Security headers configured
  - [ ] No SQL injection vulnerabilities
  - [ ] No XSS vulnerabilities
  - [ ] No prompt injection vulnerabilities
  - [ ] Rate limiting effective

## Ongoing Operations

### Weekly
- [ ] Check error logs for issues
- [ ] Verify backups completed successfully
- [ ] Monitor resource usage (CPU, memory, disk)
- [ ] Review approval rate and response quality metrics

### Monthly
- [ ] Update dependencies (`npm audit`)
- [ ] Review audit log for anomalies
- [ ] Test backup recovery process
- [ ] Review and update knowledge base

### Quarterly
- [ ] Security audit and vulnerability scan
- [ ] Performance optimization review
- [ ] Capacity planning for growth
- [ ] Update documentation

### Yearly
- [ ] Full system penetration test
- [ ] Disaster recovery drill
- [ ] Review and update all credentials
- [ ] License and compliance review

## Troubleshooting During Deployment

### Container won't start
```bash
docker-compose logs app
# Check .env file for missing/invalid values
# Check port 5000 isn't already in use
```

### Database errors
```bash
# Reset database (WARNING: deletes all data)
rm -f data/claw.db
docker-compose restart app
```

### LLM not responding
```bash
# Check LLM service
docker-compose logs ollama
# or check API key for external service
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Gmail auth failing
- Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
- Check OAuth callback URL matches exactly
- Ensure Gmail API is enabled in Google Cloud Console

### Twilio not receiving calls
- Verify webhook URL in Twilio dashboard
- Check firewall allows Twilio IPs (https://twilio.com/en-us/legal/ips)
- Test webhook manually: `curl -X POST https://your-domain.com/api/phone/handle-inbound`

## Scaling Considerations

As Claw grows:

1. **Database**: Consider migrating to PostgreSQL for better concurrency
2. **Sessions**: Use Redis for session storage if adding multiple servers
3. **Queue**: Use a task queue (Bull, RQ) for LLM requests
4. **Cache**: Add Redis for caching KB queries
5. **Load Balancer**: Add load balancing if scaling to multiple instances
6. **Storage**: Move to object storage (S3, GCS) for large files

## Documentation

Make sure to document:
- [ ] Deployment date and version
- [ ] Server specifications and location
- [ ] Backup retention policy
- [ ] Contact for emergencies
- [ ] Incident response procedures
- [ ] Rollback procedures

---

**Deployed on:** ________________  
**Deployed by:** ________________  
**Backup contact:** ________________  
**Emergency contact:** ________________  

Last updated: 2024-03-02
