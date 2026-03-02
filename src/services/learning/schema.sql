-- Claw Customer Service Learning Database Schema

-- Interactions table (core logging)
CREATE TABLE IF NOT EXISTS interactions (
  id TEXT PRIMARY KEY,
  interaction_type TEXT NOT NULL, -- 'email' or 'phone'
  customer_email TEXT,
  customer_phone TEXT,
  customer_name TEXT,
  incoming_message TEXT NOT NULL,
  generated_response TEXT NOT NULL,
  knowledge_base_sources TEXT, -- JSON array of KB sources used
  llm_model TEXT,
  llm_provider TEXT, -- 'local' (ollama) or 'cloud' (openai, claude, etc)
  created_at INTEGER NOT NULL, -- Unix timestamp
  updated_at INTEGER NOT NULL
);

-- Approvals table (feedback from human reviewers)
CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  interaction_id TEXT NOT NULL,
  status TEXT NOT NULL, -- 'approved', 'rejected', 'approved_with_edits'
  original_response TEXT NOT NULL,
  approved_response TEXT, -- NULL if rejected
  reviewer_id TEXT NOT NULL,
  feedback TEXT, -- Optional notes from reviewer
  created_at INTEGER NOT NULL,
  FOREIGN KEY (interaction_id) REFERENCES interactions(id)
);

-- Phone calls table (phone-specific logging)
CREATE TABLE IF NOT EXISTS phone_calls (
  id TEXT PRIMARY KEY,
  twilio_call_sid TEXT UNIQUE,
  interaction_id TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  call_status TEXT, -- 'inbound', 'ringing', 'in-progress', 'completed', 'failed'
  call_duration_seconds INTEGER,
  recording_url TEXT,
  transcript TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (interaction_id) REFERENCES interactions(id)
);

-- Email messages table (email-specific logging)
CREATE TABLE IF NOT EXISTS email_messages (
  id TEXT PRIMARY KEY,
  gmail_message_id TEXT UNIQUE,
  interaction_id TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (interaction_id) REFERENCES interactions(id)
);

-- Learning metrics table (tracks improvement over time)
CREATE TABLE IF NOT EXISTS learning_metrics (
  id TEXT PRIMARY KEY,
  date INTEGER NOT NULL, -- Unix timestamp (start of day)
  metric_type TEXT NOT NULL, -- 'approval_rate', 'avg_response_quality', 'kb_relevance'
  metric_value REAL NOT NULL,
  sample_size INTEGER,
  created_at INTEGER NOT NULL
);

-- Audit log (compliance & debugging)
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL, -- 'email_received', 'draft_generated', 'response_approved', etc
  resource_type TEXT, -- 'interaction', 'approval', 'settings', etc
  resource_id TEXT,
  user_id TEXT,
  details TEXT, -- JSON blob with context
  created_at INTEGER NOT NULL
);

-- Knowledge base cache (for fast lookups)
CREATE TABLE IF NOT EXISTS knowledge_base_cache (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  query_text TEXT NOT NULL,
  response_text TEXT NOT NULL,
  source_row_id TEXT, -- Google Sheet row ID
  relevance_score REAL,
  usage_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_used_at INTEGER
);

-- Settings table (per-account configuration)
CREATE TABLE IF NOT EXISTS settings (
  account_id TEXT PRIMARY KEY,
  google_sheet_id TEXT,
  twilio_account_sid TEXT,
  twilio_auth_token TEXT,
  llm_provider TEXT, -- 'ollama', 'openai', 'claude'
  llm_config TEXT, -- JSON config (model name, API key, base URL, etc)
  enable_email BOOLEAN DEFAULT 1,
  enable_phone BOOLEAN DEFAULT 1,
  max_daily_calls INTEGER,
  max_daily_emails INTEGER,
  response_tone TEXT, -- 'professional', 'friendly', 'technical'
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Team members & roles
CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  google_user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL, -- 'admin', 'approver', 'viewer'
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_interactions_type_date ON interactions(interaction_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_customer ON interactions(customer_email, customer_phone);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approvals_interaction ON approvals(interaction_id);
CREATE INDEX IF NOT EXISTS idx_phone_calls_status ON phone_calls(call_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_customer ON email_messages(customer_email);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kb_cache_category ON knowledge_base_cache(category);
CREATE INDEX IF NOT EXISTS idx_team_account ON team_members(account_id);
