# Claw Customer Service - Architecture & Implementation

## Project Overview
An AI-powered customer service automation platform built on OpenClaw infrastructure. Allows non-technical business owners to deploy multi-channel customer support in minutes.

## Core Modules

### 1. Email Service (`src/services/email/`)
- Gmail webhook receiver and email parser
- LLM-based draft response generation
- Knowledge base integration
- Approval workflow with editing capability
- Email sending via Gmail API
- Interaction logging

### 2. Phone Service (`src/services/phone/`)
- Twilio webhook handler
- Real-time response generation via LLM
- TTS integration for customer responses
- Transcript logging
- Call recording storage

### 3. Learning Engine (`src/services/learning/`)
- SQLite database for interaction logging
- Feedback collection from approvals
- Pattern analysis and improvement metrics
- Audit trail for compliance

### 4. LLM Abstraction (`src/services/llm/`)
- Local LLM support (Ollama)
- Cloud API support (OpenAI, Anthropic Claude, etc.)
- Automatic fallback mechanism
- Prompt engineering for customer service context
- Token/cost tracking

### 5. Knowledge Base (`src/services/knowledge-base/`)
- Google Sheet integration (user-managed)
- Dynamic content loading
- Caching layer
- Sync monitoring

### 6. Dashboard (`ui/src/`)
- Email approval queue
- Phone call logs and transcript viewer
- Knowledge base editor
- Learning metrics display
- Settings and configuration
- Team management (roles)
- Audit log viewer

## Technology Stack
- **Backend**: Node.js + Express (extend OpenClaw's patterns)
- **Database**: SQLite3 (self-contained)
- **Frontend**: React (simple, non-technical UX)
- **Email**: Gmail API + Webhooks
- **Phone**: Twilio SDK
- **LLM**: Ollama (local) + OpenAI/Claude APIs (cloud)
- **Auth**: Google OAuth (leverage OpenClaw)
- **Deployment**: Docker + docker-compose

## Security Patterns
- Input sanitization for all user-provided content
- Prompt injection prevention (template-based responses)
- Rate limiting on endpoints
- Google OAuth for auth (no passwords stored)
- Secrets in .env file (not in code)
- Data encryption for sensitive info
- Full audit logging of all actions

## Deployment Targets
1. Docker (docker-compose up)
2. VPS (Ubuntu with systemd)
3. Local Node.js (npm start)
4. Self-hosted (privacy-first)

## Implementation Phases

### Phase 1: Architecture ✅
- [x] Analyze OpenClaw structure
- [x] Design module interfaces
- [x] Plan directory structure
- [x] Document API contracts

### Phase 2: Core Build (IN PROGRESS)
- [ ] Email module (parse → draft → approve → send)
- [ ] Phone module (receive → respond → log)
- [ ] Learning engine (SQLite setup, logging)
- [ ] LLM abstraction (local + cloud)
- [ ] Dashboard components

### Phase 3: Integration & Testing
- [ ] End-to-end email workflow
- [ ] End-to-end phone workflow
- [ ] Learning feedback integration
- [ ] Security testing (prompt injection, etc.)
- [ ] Dashboard functional testing

### Phase 4: Validation & Security
- [ ] Security audit
- [ ] OAuth verification
- [ ] Data encryption verification
- [ ] Audit logging verification
- [ ] Code quality and performance checks

### Phase 5: Deployment & Release
- [ ] Docker setup
- [ ] Setup scripts (interactive + VPS)
- [ ] Documentation
- [ ] GitHub release
- [ ] Docker Hub push

## Key Features
1. **Non-technical Setup**: Interactive setup.sh guides users through configuration
2. **Privacy-First**: Option to run locally with Ollama
3. **Learning System**: Automatically improves responses based on user approvals
4. **Flexible LLM**: Switch between local and cloud LLMs without redeployment
5. **Google Sheets Integration**: User updates knowledge base directly in Sheet
6. **Role-Based Access**: Admin, Approver, Viewer roles
7. **Audit Trail**: Complete history of all actions for compliance

## Quality Gates
- ✅ Security: No prompt injection, OAuth working, secrets encrypted
- ✅ Functionality: Email, phone, approvals, learning all working
- ✅ UX: Dashboard usable by non-technical users
- ✅ Performance: <2s draft generation, <5s phone response
- ✅ Learning: Demonstrable improvement after 10+ interactions
- ✅ Deployment: Docker/VPS setup works cleanly
- ✅ Documentation: Non-technical users can follow setup guide

