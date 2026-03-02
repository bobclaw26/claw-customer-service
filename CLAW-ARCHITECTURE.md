# Claw Customer Service - Architecture

## System Overview

Claw Customer Service is a modular, extensible platform for automating customer support. It processes incoming emails and phone calls, generates AI-powered responses, tracks approvals, and learns over time.

## Core Modules

### 1. Email Service (`src/services/email/`)

**Purpose:** Handle Gmail integration for email-based support

**Components:**
- Gmail Webhook Receiver
- Email Parser
- Draft Generator
- Approval Workflow Engine
- Email Sender

**Flow:**

```
Gmail Webhook
    ↓
Parse Email (from, subject, body)
    ↓
Lookup Knowledge Base (find relevant entries)
    ↓
Generate Response (via LLM)
    ↓
Create Draft (cache in memory)
    ↓
Dashboard Queue
    ↓
Human Review/Approval
    ↓
Send via Gmail API
    ↓
Log to Learning Engine
```

**Key Classes:**
- `EmailService` - Main service class
- `EmailDraft` - In-memory draft representation
- API Route: `/api/email/*`

**Database Tables:**
- `interactions` - Store each email request
- `approvals` - Track approvals/rejections/edits
- `email_messages` - Store sent emails

### 2. Phone Service (`src/services/phone/`)

**Purpose:** Handle Twilio integration for phone-based support

**Components:**
- Twilio Webhook Handler
- Call Context Manager
- Response Generator
- TTS Integration
- Transcript Logger

**Flow:**

```
Twilio Incoming Call
    ↓
Create Call Context
    ↓
Greeting Message (TTS)
    ↓
Gather Customer Input
    ↓
Lookup Knowledge Base
    ↓
Generate Response (via LLM)
    ↓
Speak Response (TTS)
    ↓
End Call
    ↓
Log Transcript
    ↓
Update Learning Engine
```

**TwiML (Twilio Markup Language) Example:**

```xml
<Response>
  <Say voice="alice">How can I help you?</Say>
  <Gather numDigits="1" timeout="10" action="/api/phone/gather">
    <Say>Press a key or state your question</Say>
  </Gather>
</Response>
```

**Key Classes:**
- `PhoneService` - Main service class
- `CallContext` - In-memory call state
- API Routes: `/api/phone/*`

**Database Tables:**
- `phone_calls` - Call records
- `interactions` - Linked to interactions table

### 3. Learning Engine (`src/services/learning/`)

**Purpose:** Persistent logging, feedback collection, and metrics

**Components:**
- SQLite Database Manager
- Interaction Logger
- Approval Tracker
- Metrics Calculator
- Audit Logger
- Retention Policy

**Key Classes:**
- `LearningEngine` - Main database service
- Schema: `src/services/learning/schema.sql`

**Database Tables:**

```
interactions
├─ id, type (email|phone)
├─ customer_email, customer_phone, customer_name
├─ incoming_message
├─ generated_response
├─ knowledge_base_sources (JSON array)
├─ llm_model, llm_provider
└─ timestamps

approvals
├─ id, interaction_id
├─ status (approved|rejected|approved_with_edits)
├─ original_response
├─ approved_response
├─ reviewer_id
├─ feedback
└─ timestamps

phone_calls
├─ id, twilio_call_sid
├─ interaction_id
├─ customer_phone, call_status
├─ duration, recording_url
├─ transcript
└─ timestamps

email_messages
├─ id, gmail_message_id
├─ interaction_id
├─ customer_email, subject, body
├─ sent_at
└─ timestamps

learning_metrics
├─ date, metric_type
├─ metric_value, sample_size
└─ timestamps

audit_log
├─ action (email_received, response_approved, etc)
├─ resource_type, resource_id
├─ user_id, details (JSON)
└─ timestamp

knowledge_base_cache
├─ id, category, query
├─ response_text, relevance_score
├─ usage_count, last_used_at
└─ timestamps

settings
├─ account_id
├─ google_sheet_id
├─ twilio_config (encrypted)
├─ llm_provider, llm_config
└─ timestamps

team_members
├─ id, account_id, google_user_id
├─ email, name, role
└─ timestamps
```

**Metrics Calculation:**

```
approval_rate = (approved + edited) / total * 100
response_quality = based on approval feedback
trending_issues = GROUP BY category, ORDER BY count DESC
model_improvement = trend over time
```

### 4. LLM Abstraction (`src/services/llm/`)

**Purpose:** Unified interface for multiple LLM providers with fallback

**Supported Providers:**
- Ollama (local, self-hosted)
- OpenAI (GPT-3.5, GPT-4)
- Anthropic Claude (Sonnet, Opus)

**Architecture:**

```
User Request
    ↓
Primary Provider (Ollama)
    ├─ Success → Return Response
    └─ Failure ↓
       Fallback 1 (OpenAI)
       ├─ Success → Return Response
       └─ Failure ↓
          Fallback 2 (Claude)
          ├─ Success → Return Response
          └─ Failure → Error
```

**Response Generation:**

```
System Prompt (with knowledge base context)
+ User Prompt (customer question + context)
    ↓
LLM Provider
    ↓
Parsed Response
    ↓
Store in Interaction
```

**Prompt Engineering:**

```
System: "You are a helpful customer service representative.
Knowledge Base:
[Q&A pairs from knowledge base]

Important:
- Keep responses concise (2-3 sentences)
- Only use information from KB
- Be empathetic and professional
- Do NOT make up information"

User: "[customer question]"
```

**Key Classes:**
- `LLMProvider` - Main provider class
- Supported methods: `generateResponse()`
- Configuration: Via environment variables

### 5. Knowledge Base Service (`src/services/knowledge-base/`)

**Purpose:** Google Sheets integration for user-managed knowledge base

**Features:**
- Load FAQ from Google Sheet
- Caching (1 hour TTL)
- Search with relevance scoring
- Keyword-based matching
- Add/update entries
- Export/import as JSON

**Google Sheet Format:**

```
| Category | Question | Answer | Keywords |
|----------|----------|--------|----------|
| Hours    | What are your hours? | ... | hours,availability |
| Returns  | How do I return? | ... | return,refund |
```

**Search Algorithm:**

```
1. Split query into keywords
2. For each entry:
   - Score keyword matches (exact > partial)
   - Score question/answer text matches
   - Assign relevance score
3. Return top N results (default: 5)
4. Cache results for 1 hour
```

**Key Classes:**
- `KnowledgeBaseService` - Main service
- Uses Google Sheets API v4
- In-memory caching with `node-cache`

### 6. Express App (`src/app.ts`)

**Purpose:** Main application entry point, route registration, service initialization

**Initialization Flow:**

```
Create Express App
    ↓
Setup Middleware (JSON, CORS, logging)
    ↓
Initialize Services:
    ├─ Learning Engine
    ├─ LLM Provider
    ├─ Google APIs (OAuth)
    ├─ Knowledge Base (from Google Sheets)
    ├─ Email Service
    └─ Phone Service
    ↓
Register Routes:
    ├─ /api/email/*
    ├─ /api/phone/*
    └─ /api/dashboard/*
    ↓
Setup Health Check & Maintenance
    ↓
Listen on Port
```

**Middleware Pipeline:**

```
Request
  ↓
Body Parser (JSON/URL-encoded)
  ↓
CORS Headers
  ↓
Logging
  ↓
Route Handler
  ↓
Error Handler
  ↓
Response
```

## API Route Structure

### Email Routes (`/api/email/`)

```
GET    /drafts              - List pending drafts
GET    /drafts/:id         - Get draft details
POST   /drafts/:id/approve - Approve (optionally with edits)
POST   /drafts/:id/reject  - Reject draft
POST   /webhook            - Gmail webhook endpoint
```

### Phone Routes (`/api/phone/`)

```
POST   /incoming           - Handle incoming call
POST   /gather             - Process customer input
POST   /status             - Call status callback
GET    /status/:callSid   - Get call details
```

### Dashboard Routes (`/api/dashboard/`)

```
GET    /metrics            - Learning metrics
GET    /interactions       - List recent interactions
GET    /interactions/:id  - Interaction details
GET    /knowledge-base    - KB entries
POST   /knowledge-base    - Add KB entry
PUT    /knowledge-base/:id - Update KB entry
POST   /knowledge-base/sync - Sync from Google Sheets
POST   /cleanup           - Clean old records (admin)
```

## Security Architecture

### Authentication

```
Google OAuth 2.0
    ↓
User logs in with Google account
    ↓
Exchange auth code for access token
    ↓
Store token in secure cookie/session
    ↓
Use token for subsequent API calls
    ↓
All API calls require valid session
```

### Input Validation

```
Request
    ↓
Validate structure (JSON schema)
    ↓
Sanitize strings (remove special chars)
    ↓
Limit size (max 10KB per request)
    ↓
Rate limit check (100 req/min per user)
    ↓
Process
```

### Prompt Injection Prevention

```
Customer Input (untrusted)
    ↓
Sanitize (remove control characters)
    ↓
Template-based prompts (fixed structure)
    ↓
No direct string concatenation
    ↓
Send to LLM
```

### Data Protection

```
Sensitive Data (API keys, tokens)
    ↓
Environment variables (.env)
    ↓
Encrypted storage (settings table)
    ↓
Never logged or exposed in UI
    ↓
Proper access controls
```

## Deployment Architecture

### Docker Deployment

```
docker-compose.yml
    ├─ Service: claw (Node.js app)
    │   ├─ Port 3000
    │   ├─ Volume: claw-data (persistent)
    │   └─ Env: .env
    │
    └─ Service: ollama (Optional LLM)
        ├─ Port 11434
        ├─ Volume: ollama-data (persistent)
        └─ Preloads: llama2 model
```

### VPS Deployment

```
Ubuntu Server
    ├─ Node.js v20+
    ├─ SQLite3
    ├─ Systemd Service
    │   └─ claw-customer-service.service
    ├─ Nginx Reverse Proxy
    │   ├─ Port 80/443
    │   └─ Proxies to localhost:3000
    └─ Let's Encrypt SSL
        └─ Auto-renewal
```

## Data Flow Diagrams

### Email Processing Flow

```
┌──────────────────┐
│  Gmail Webhook   │
└────────┬─────────┘
         │
         ↓
┌──────────────────────┐
│  Parse Email         │
│  (Extract from, to,  │
│   subject, body)     │
└────────┬─────────────┘
         │
         ↓
┌──────────────────────┐
│  Knowledge Base      │
│  Search & Relevance  │
│  Score              │
└────────┬─────────────┘
         │
         ↓
┌──────────────────────┐
│  LLM Response Gen    │
│  (With KB context)   │
└────────┬─────────────┘
         │
         ↓
┌──────────────────────┐
│  Learning Engine     │
│  Log Interaction     │
└────────┬─────────────┘
         │
         ↓
┌──────────────────────┐
│  Dashboard Queue     │
│  Await Approval      │
└────────┬─────────────┘
         │
    ┌────┴────┐
    │          │
    ↓          ↓
┌─────────┐ ┌──────────┐
│ Approve │ │  Reject  │
│(optional│ │ + Feedback
│ edits)  │ └──────────┘
└────┬────┘
     │
     ↓
┌──────────────────────┐
│  Gmail API           │
│  Send Response       │
└────────┬─────────────┘
     │
     ↓
┌──────────────────────┐
│  Learning Engine     │
│  Log Approval        │
└──────────────────────┘
```

### Phone Processing Flow

```
┌──────────────────┐
│  Twilio Webhook  │
│  (Incoming Call) │
└────────┬─────────┘
         │
         ↓
┌──────────────────────┐
│  Create Call Context │
│  Store in Memory     │
└────────┬─────────────┘
         │
         ↓
┌──────────────────────┐
│  Greeting Message    │
│  (TTS via Twilio)    │
└────────┬─────────────┘
         │
         ↓
┌──────────────────────┐
│  Gather Customer     │
│  Input (Digits/     │
│  Speech)             │
└────────┬─────────────┘
         │
         ↓
┌──────────────────────┐
│  Knowledge Base      │
│  Search             │
└────────┬─────────────┘
         │
         ↓
┌──────────────────────┐
│  LLM Response Gen    │
└────────┬─────────────┘
         │
         ↓
┌──────────────────────┐
│  TTS Response        │
│  (Speak to Customer) │
└────────┬─────────────┘
         │
         ↓
┌──────────────────────┐
│  End Call            │
└────────┬─────────────┘
         │
         ↓
┌──────────────────────┐
│  Learning Engine     │
│  Log Call            │
│  Store Transcript    │
└──────────────────────┘
```

## Performance Considerations

### Database Indexing

```sql
-- Frequently queried columns
CREATE INDEX idx_interactions_type_date 
  ON interactions(interaction_type, created_at DESC);

CREATE INDEX idx_approvals_status
  ON approvals(status, created_at DESC);

-- Search optimization
CREATE INDEX idx_kb_cache_category
  ON knowledge_base_cache(category);
```

### Caching Strategy

```
Level 1: Knowledge Base Cache (1 hour)
  ├─ Google Sheet entries in memory
  └─ Auto-refresh on update

Level 2: LLM Response Cache (Session)
  ├─ Similar queries → similar responses
  └─ Reduce API calls

Level 3: Database Query Cache
  ├─ Metrics calculations
  └─ Interaction searches
```

### Scaling Considerations

**Vertical Scaling:**
- Increase Node.js heap size
- More CPU cores for Ollama
- More RAM for caching

**Horizontal Scaling:**
- Run multiple Node.js instances
- Load balancer (HAProxy, nginx)
- Shared SQLite with WAL mode
- Or migrate to PostgreSQL

## Environment Variables

```
# Server
PORT, NODE_ENV

# Google APIs
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URL, GOOGLE_OAUTH_TOKEN
GOOGLE_SHEET_ID

# Twilio
TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER

# LLM Primary
LLM_PRIMARY_PROVIDER, LLM_PRIMARY_MODEL
LLM_PRIMARY_BASE_URL, LLM_PRIMARY_API_KEY

# LLM Fallback
LLM_FALLBACK_PROVIDER, LLM_FALLBACK_MODEL
LLM_FALLBACK_API_KEY

# Database
CLAW_DATA_DIR, DATABASE_URL

# Features
ENABLE_EMAIL, ENABLE_PHONE

# Logging
LOG_LEVEL, LOG_FORMAT

# Security
ENCRYPTION_KEY, PROMPT_INJECTION_PROTECTION

# Retention
DATA_RETENTION_DAYS
```

## Error Handling

### Service-Level Errors

```
LLM Provider Failure
  → Fallback to next provider
  → If all fail → Return generic error
  → Log to audit trail

Database Error
  → Retry with exponential backoff
  → Fall back to in-memory cache
  → Alert admin

Google API Error
  → Check credentials
  → Verify quota
  → Alert admin
```

### Client-Level Errors

```
400 Bad Request
  → Invalid JSON/parameters
  
401 Unauthorized
  → Missing/invalid auth token
  
403 Forbidden
  → Insufficient permissions
  
404 Not Found
  → Resource doesn't exist
  
429 Too Many Requests
  → Rate limit exceeded
  
500 Server Error
  → Internal error (logged)
```

## Testing Strategy

```
Unit Tests
  ├─ Email service (draft generation, parsing)
  ├─ Phone service (TwiML generation)
  ├─ LLM abstraction (provider switching)
  └─ Knowledge base (search relevance)

Integration Tests
  ├─ Email workflow (receive → draft → send)
  ├─ Phone workflow (call → respond → log)
  └─ Learning feedback integration

End-to-End Tests
  ├─ Full email approval flow
  ├─ Full phone call flow
  └─ Learning improvements over time

Security Tests
  ├─ Prompt injection attempts
  ├─ SQL injection attempts
  ├─ Rate limiting verification
  └─ Auth verification
```

---

This architecture supports scalable, secure, and maintainable customer service automation.
