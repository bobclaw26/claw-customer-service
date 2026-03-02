import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

interface Interaction {
  id: string;
  interaction_type: 'email' | 'phone';
  customer_email?: string;
  customer_phone?: string;
  customer_name?: string;
  incoming_message: string;
  generated_response: string;
  knowledge_base_sources?: string;
  llm_model?: string;
  llm_provider?: string;
  created_at: number;
  updated_at: number;
}

interface Approval {
  id: string;
  interaction_id: string;
  status: 'approved' | 'rejected' | 'approved_with_edits';
  original_response: string;
  approved_response?: string;
  reviewer_id: string;
  feedback?: string;
  created_at: number;
}

interface AuditLogEntry {
  id: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  user_id?: string;
  details?: string;
  created_at: number;
}

export class LearningEngine {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || path.join(process.env.CLAW_DATA_DIR || '/tmp', 'claw-learning.db');
    
    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL'); // Write-ahead logging for better concurrency
    this.initializeSchema();
  }

  private initializeSchema(): void {
    // Read schema from schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      this.db.exec(schema);
    } else {
      console.warn(`Schema file not found at ${schemaPath}`);
    }
  }

  /**
   * Log an interaction (email or phone response generation)
   */
  logInteraction(interaction: Omit<Interaction, 'id' | 'created_at' | 'updated_at'>): string {
    const id = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    const stmt = this.db.prepare(`
      INSERT INTO interactions (
        id, interaction_type, customer_email, customer_phone, customer_name,
        incoming_message, generated_response, knowledge_base_sources,
        llm_model, llm_provider, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      interaction.interaction_type,
      interaction.customer_email,
      interaction.customer_phone,
      interaction.customer_name,
      interaction.incoming_message,
      interaction.generated_response,
      interaction.knowledge_base_sources,
      interaction.llm_model,
      interaction.llm_provider,
      now,
      now
    );

    return id;
  }

  /**
   * Record approval/rejection of a response
   */
  logApproval(approval: Omit<Approval, 'id' | 'created_at'>): string {
    const id = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    const stmt = this.db.prepare(`
      INSERT INTO approvals (
        id, interaction_id, status, original_response, approved_response,
        reviewer_id, feedback, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      approval.interaction_id,
      approval.status,
      approval.original_response,
      approval.approved_response,
      approval.reviewer_id,
      approval.feedback,
      now
    );

    // Log to audit trail
    this.logAudit({
      action: `response_${approval.status}`,
      resource_type: 'approval',
      resource_id: id,
      user_id: approval.reviewer_id,
      details: JSON.stringify({
        interaction_id: approval.interaction_id,
        has_edits: approval.status === 'approved_with_edits'
      })
    });

    return id;
  }

  /**
   * Log a phone call
   */
  logPhoneCall(callData: {
    twilio_call_sid: string;
    interaction_id: string;
    customer_phone: string;
    call_status?: string;
    call_duration_seconds?: number;
    recording_url?: string;
    transcript?: string;
  }): string {
    const id = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    const stmt = this.db.prepare(`
      INSERT INTO phone_calls (
        id, twilio_call_sid, interaction_id, customer_phone, call_status,
        call_duration_seconds, recording_url, transcript, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      callData.twilio_call_sid,
      callData.interaction_id,
      callData.customer_phone,
      callData.call_status || 'in-progress',
      callData.call_duration_seconds,
      callData.recording_url,
      callData.transcript,
      now,
      now
    );

    return id;
  }

  /**
   * Log an email message
   */
  logEmail(emailData: {
    gmail_message_id: string;
    interaction_id: string;
    customer_email: string;
    subject: string;
    body: string;
    sent_at: number;
  }): string {
    const id = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    const stmt = this.db.prepare(`
      INSERT INTO email_messages (
        id, gmail_message_id, interaction_id, customer_email, subject, body,
        sent_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      emailData.gmail_message_id,
      emailData.interaction_id,
      emailData.customer_email,
      emailData.subject,
      emailData.body,
      emailData.sent_at,
      now,
      now
    );

    return id;
  }

  /**
   * Log an action to audit trail
   */
  logAudit(entry: Omit<AuditLogEntry, 'id' | 'created_at'>): string {
    const id = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    const stmt = this.db.prepare(`
      INSERT INTO audit_log (
        id, action, resource_type, resource_id, user_id, details, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      entry.action,
      entry.resource_type,
      entry.resource_id,
      entry.user_id,
      entry.details,
      now
    );

    return id;
  }

  /**
   * Get interaction with all related data
   */
  getInteraction(interactionId: string): any {
    const interaction = this.db.prepare(
      'SELECT * FROM interactions WHERE id = ?'
    ).get(interactionId);

    if (!interaction) {return null;}

    const approval = this.db.prepare(
      'SELECT * FROM approvals WHERE interaction_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(interactionId);

    const phoneCall = this.db.prepare(
      'SELECT * FROM phone_calls WHERE interaction_id = ?'
    ).get(interactionId);

    const email = this.db.prepare(
      'SELECT * FROM email_messages WHERE interaction_id = ?'
    ).get(interactionId);

    return {
      interaction,
      approval,
      phoneCall,
      email
    };
  }

  /**
   * Get recent interactions for a time period
   */
  getRecentInteractions(limit: number = 50, type?: 'email' | 'phone'): any[] {
    let query = 'SELECT * FROM interactions';
    const params: any[] = [];

    if (type) {
      query += ' WHERE interaction_type = ?';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    return this.db.prepare(query).all(...params);
  }

  /**
   * Get approval rate (percentage of responses approved)
   */
  getApprovalRate(days: number = 7): number {
    const cutoff = Math.floor(Date.now() / 1000) - (days * 86400);

    const result = this.db.prepare(`
      SELECT COUNT(*) as total, 
             SUM(CASE WHEN status IN ('approved', 'approved_with_edits') THEN 1 ELSE 0 END) as approved
      FROM approvals
      WHERE created_at >= ?
    `).get(cutoff) as any;

    if (result.total === 0) {return 0;}
    return (result.approved / result.total) * 100;
  }

  /**
   * Get learning metrics
   */
  getLearningMetrics(days: number = 30): {
    approval_rate: number;
    total_interactions: number;
    approved_count: number;
    rejected_count: number;
    edited_count: number;
    email_count: number;
    phone_count: number;
  } {
    const cutoff = Math.floor(Date.now() / 1000) - (days * 86400);

    const metrics = {
      approval_rate: 0,
      total_interactions: 0,
      approved_count: 0,
      rejected_count: 0,
      edited_count: 0,
      email_count: 0,
      phone_count: 0
    };

    // Get approval stats
    const approvalStats = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'approved_with_edits' THEN 1 ELSE 0 END) as edited
      FROM approvals
      WHERE created_at >= ?
    `).get(cutoff) as any;

    metrics.approved_count = approvalStats.approved || 0;
    metrics.rejected_count = approvalStats.rejected || 0;
    metrics.edited_count = approvalStats.edited || 0;

    if (approvalStats.total > 0) {
      metrics.approval_rate = ((approvalStats.approved + approvalStats.edited) / approvalStats.total) * 100;
    }

    // Get interaction stats
    const interactionStats = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN interaction_type = 'email' THEN 1 ELSE 0 END) as email_count,
        SUM(CASE WHEN interaction_type = 'phone' THEN 1 ELSE 0 END) as phone_count
      FROM interactions
      WHERE created_at >= ?
    `).get(cutoff) as any;

    metrics.total_interactions = interactionStats.total || 0;
    metrics.email_count = interactionStats.email_count || 0;
    metrics.phone_count = interactionStats.phone_count || 0;

    return metrics;
  }

  /**
   * Clean up old records (retention policy)
   */
  cleanupOldRecords(daysToKeep: number = 90): { deleted: number } {
    const cutoff = Math.floor(Date.now() / 1000) - (daysToKeep * 86400);

    const interactions = this.db.prepare(
      'DELETE FROM interactions WHERE created_at < ?'
    ).run(cutoff).changes;

    this.db.prepare('DELETE FROM approvals WHERE created_at < ?').run(cutoff);
    this.db.prepare('DELETE FROM phone_calls WHERE created_at < ?').run(cutoff);
    this.db.prepare('DELETE FROM email_messages WHERE created_at < ?').run(cutoff);
    this.db.prepare('DELETE FROM audit_log WHERE created_at < ?').run(cutoff);

    return { deleted: interactions };
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}

// Export singleton instance
let engine: LearningEngine;

export function getLearningEngine(): LearningEngine {
  if (!engine) {
    engine = new LearningEngine();
  }
  return engine;
}

export function initializeLearningEngine(dbPath?: string): LearningEngine {
  if (engine) {
    engine.close();
  }
  engine = new LearningEngine(dbPath);
  return engine;
}
