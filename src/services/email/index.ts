import { gmail_v1 } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';
import { getLearningEngine } from '../learning';
import { getLLMProvider } from '../llm';
import { KnowledgeBaseService } from '../knowledge-base';

export interface EmailDraft {
  id: string;
  gmail_message_id: string;
  customer_email: string;
  customer_name?: string;
  incoming_subject: string;
  incoming_message: string;
  generated_response: string;
  knowledge_base_sources: string[];
  created_at: number;
  expires_at: number;
}

export class EmailService {
  private gmailAPI: gmail_v1.Gmail;
  private knowledgeBase: KnowledgeBaseService;
  private draftCache: Map<string, EmailDraft> = new Map();

  constructor(gmailAPI: gmail_v1.Gmail, knowledgeBase: KnowledgeBaseService) {
    this.gmailAPI = gmailAPI;
    this.knowledgeBase = knowledgeBase;
  }

  /**
   * Parse incoming email from Gmail webhook
   */
  async parseIncomingEmail(gmailMessageId: string): Promise<{
    subject: string;
    from: string;
    name: string;
    body: string;
  }> {
    try {
      const message = await this.gmailAPI.users.messages.get({
        userId: 'me',
        id: gmailMessageId,
        format: 'full'
      });

      const headers = message.data.payload?.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
      const from = headers.find(h => h.name === 'From')?.value || '';
      const body = this.extractMessageBody(message.data.payload);

      // Parse email address and name
      const emailMatch = from.match(/<(.+?)>/);
      const email = emailMatch ? emailMatch[1] : from;
      const nameMatch = from.match(/^([^<]+)</);
      const name = nameMatch ? nameMatch[1].trim().replace(/"/g, '') : email;

      return { subject, from: email, name, body };
    } catch (error) {
      console.error('Error parsing email:', error);
      throw error;
    }
  }

  /**
   * Generate a draft response for an incoming email
   */
  async generateDraft(
    gmailMessageId: string,
    incomingEmail: {
      subject: string;
      from: string;
      name: string;
      body: string;
    }
  ): Promise<EmailDraft> {
    try {
      // Find relevant KB entries
      const relevantEntries = await this.knowledgeBase.findRelevantEntries(
        `${incomingEmail.subject} ${incomingEmail.body}`,
        5
      );

      const kbContext = relevantEntries
        .map(e => `Q: ${e.question}\nA: ${e.answer}`)
        .join('\n\n');

      // Generate response
      const llm = getLLMProvider();
      const llmResponse = await llm.generateResponse(incomingEmail.body, kbContext, {
        customerName: incomingEmail.name,
        tone: 'professional'
      });

      const draftId = uuidv4();
      const now = Date.now();
      const draft: EmailDraft = {
        id: draftId,
        gmail_message_id: gmailMessageId,
        customer_email: incomingEmail.from,
        customer_name: incomingEmail.name,
        incoming_subject: incomingEmail.subject,
        incoming_message: incomingEmail.body,
        generated_response: llmResponse.content,
        knowledge_base_sources: relevantEntries.map(e => e.id),
        created_at: now,
        expires_at: now + (24 * 60 * 60 * 1000) // 24 hour expiry
      };

      // Cache draft
      this.draftCache.set(draftId, draft);

      // Log to learning engine
      const learning = getLearningEngine();
      const interactionId = learning.logInteraction({
        interaction_type: 'email',
        customer_email: incomingEmail.from,
        customer_name: incomingEmail.name,
        incoming_message: incomingEmail.body,
        generated_response: llmResponse.content,
        knowledge_base_sources: JSON.stringify(relevantEntries.map(e => e.id)),
        llm_model: llmResponse.model,
        llm_provider: llmResponse.provider
      });

      // Store draft with interaction ID
      (draft as any).interaction_id = interactionId;

      return draft;
    } catch (error) {
      console.error('Error generating draft:', error);
      throw error;
    }
  }

  /**
   * Get a draft for review
   */
  getDraft(draftId: string): EmailDraft | null {
    const draft = this.draftCache.get(draftId);
    if (!draft) {return null;}

    // Check expiry
    if (draft.expires_at < Date.now()) {
      this.draftCache.delete(draftId);
      return null;
    }

    return draft;
  }

  /**
   * Approve and send a draft
   */
  async approveDraft(
    draftId: string,
    reviewerId: string,
    editedResponse?: string
  ): Promise<{
    message_id: string;
    timestamp: number;
  }> {
    const draft = this.getDraft(draftId);
    if (!draft) {
      throw new Error('Draft not found or expired');
    }

    try {
      const responseToSend = editedResponse || draft.generated_response;
      const subject = `Re: ${draft.incoming_subject}`;
      const message = this.createRawMessage(draft.customer_email, subject, responseToSend);

      // Send via Gmail API
      const result = await this.gmailAPI.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: message
        }
      });

      const sentMessageId = result.data.id || '';

      // Log to learning engine
      const learning = getLearningEngine();
      learning.logApproval({
        interaction_id: (draft as any).interaction_id,
        status: editedResponse ? 'approved_with_edits' : 'approved',
        original_response: draft.generated_response,
        approved_response: responseToSend,
        reviewer_id: reviewerId
      });

      // Log sent email
      learning.logEmail({
        gmail_message_id: sentMessageId,
        interaction_id: (draft as any).interaction_id,
        customer_email: draft.customer_email,
        subject,
        body: responseToSend,
        sent_at: Math.floor(Date.now() / 1000)
      });

      // Remove from cache
      this.draftCache.delete(draftId);

      return {
        message_id: sentMessageId,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Reject a draft
   */
  async rejectDraft(
    draftId: string,
    reviewerId: string,
    feedback?: string
  ): Promise<void> {
    const draft = this.getDraft(draftId);
    if (!draft) {
      throw new Error('Draft not found or expired');
    }

    const learning = getLearningEngine();
    learning.logApproval({
      interaction_id: (draft as any).interaction_id,
      status: 'rejected',
      original_response: draft.generated_response,
      reviewer_id: reviewerId,
      feedback
    });

    this.draftCache.delete(draftId);
  }

  /**
   * List pending drafts
   */
  listPendingDrafts(): EmailDraft[] {
    const now = Date.now();
    const pending: EmailDraft[] = [];

    for (const [draftId, draft] of this.draftCache) {
      if (draft.expires_at > now) {
        pending.push(draft);
      } else {
        this.draftCache.delete(draftId);
      }
    }

    return pending;
  }

  /**
   * Extract text body from Gmail message
   */
  private extractMessageBody(payload: any): string {
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain') {
          if (part.body?.data) {
            return Buffer.from(part.body.data, 'base64').toString('utf-8');
          }
        }
      }
    }

    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    return '';
  }

  /**
   * Create a raw MIME message for sending
   */
  private createRawMessage(to: string, subject: string, body: string): string {
    const msg = `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset="UTF-8"\r\n\r\n${body}`;
    return Buffer.from(msg).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
  }
}

/**
 * Create email service instance
 */
export async function createEmailService(
  gmailAPI: gmail_v1.Gmail,
  knowledgeBase: KnowledgeBaseService
): Promise<EmailService> {
  const service = new EmailService(gmailAPI, knowledgeBase);
  console.log('Email Service initialized successfully');
  return service;
}
