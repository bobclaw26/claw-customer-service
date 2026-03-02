import { Router, Request, Response } from 'express';
import { EmailService } from '../services/email';
import { getLearningEngine } from '../services/learning';

export function createEmailRouter(emailService: EmailService): Router {
  const router = Router();
  const learning = getLearningEngine();

  /**
   * GET /api/email/drafts
   * List pending email drafts for review
   */
  router.get('/drafts', (_req: Request, res: Response) => {
    try {
      const drafts = emailService.listPendingDrafts();
      res.json({
        success: true,
        count: drafts.length,
        drafts: drafts.map(d => ({
          id: d.id,
          customer_email: d.customer_email,
          customer_name: d.customer_name,
          incoming_subject: d.incoming_subject,
          generated_response: d.generated_response,
          created_at: d.created_at,
          expires_at: d.expires_at
        }))
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: String(error)
      });
    }
  });

  /**
   * GET /api/email/drafts/:draftId
   * Get a specific draft
   */
  router.get('/drafts/:draftId', (req: Request, res: Response) => {
    try {
      const draft = emailService.getDraft(req.params.draftId);
      if (!draft) {
        return res.status(404).json({
          success: false,
          error: 'Draft not found or expired'
        });
      }

      res.json({
        success: true,
        draft: {
          id: draft.id,
          customer_email: draft.customer_email,
          customer_name: draft.customer_name,
          incoming_subject: draft.incoming_subject,
          incoming_message: draft.incoming_message,
          generated_response: draft.generated_response,
          knowledge_base_sources: draft.knowledge_base_sources,
          created_at: draft.created_at
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: String(error)
      });
    }
  });

  /**
   * POST /api/email/drafts/:draftId/approve
   * Approve a draft (optionally with edits)
   */
  router.post('/drafts/:draftId/approve', async (req: Request, res: Response) => {
    try {
      const { edited_response } = req.body;
      const userId = req.headers['x-user-id'] as string || 'unknown';

      const result = await emailService.approveDraft(
        req.params.draftId,
        userId,
        edited_response
      );

      res.json({
        success: true,
        message_id: result.message_id,
        timestamp: result.timestamp
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: String(error)
      });
    }
  });

  /**
   * POST /api/email/drafts/:draftId/reject
   * Reject a draft
   */
  router.post('/drafts/:draftId/reject', async (req: Request, res: Response) => {
    try {
      const { feedback } = req.body;
      const userId = req.headers['x-user-id'] as string || 'unknown';

      await emailService.rejectDraft(req.params.draftId, userId, feedback);

      res.json({
        success: true,
        message: 'Draft rejected'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: String(error)
      });
    }
  });

  /**
   * POST /api/email/webhook
   * Gmail webhook for incoming emails
   */
  router.post('/webhook', async (req: Request, res: Response) => {
    try {
      const { message } = req.body;
      if (!message || !message.data) {
        return res.status(400).json({
          success: false,
          error: 'Invalid webhook payload'
        });
      }

      // Decode the Gmail message ID
      const data = Buffer.from(message.data, 'base64').toString('utf-8');
      const parsed = JSON.parse(data);
      const gmailMessageId = parsed.emailAddress;

      // Parse the email
      const parsedEmail = await emailService.parseIncomingEmail(gmailMessageId);

      // Generate a draft response
      const draft = await emailService.generateDraft(gmailMessageId, parsedEmail);

      // Log to audit
      learning.logAudit({
        action: 'email_received',
        resource_type: 'email',
        resource_id: gmailMessageId,
        details: JSON.stringify({
          from: parsedEmail.from,
          subject: parsedEmail.subject
        })
      });

      res.json({
        success: true,
        draft_id: draft.id,
        message: 'Email received and draft generated'
      });
    } catch (error) {
      console.error('Error processing email webhook:', error);
      res.status(500).json({
        success: false,
        error: String(error)
      });
    }
  });

  return router;
}
