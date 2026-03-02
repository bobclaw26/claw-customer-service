import { Router, Request, Response } from 'express';
import { getLearningEngine } from '../services/learning';
import { KnowledgeBaseService } from '../services/knowledge-base';

export function createDashboardRouter(kb: KnowledgeBaseService): Router {
  const router = Router();
  const learning = getLearningEngine();

  /**
   * GET /api/dashboard/metrics
   * Get learning metrics and statistics
   */
  router.get('/metrics', (_req: Request, res: Response) => {
    try {
      const metrics = learning.getLearningMetrics(30);

      res.json({
        success: true,
        metrics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: String(error)
      });
    }
  });

  /**
   * GET /api/dashboard/interactions
   * List recent interactions
   */
  router.get('/interactions', (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const type = req.query.type as 'email' | 'phone' | undefined;

      const interactions = learning.getRecentInteractions(limit, type);

      res.json({
        success: true,
        count: interactions.length,
        interactions
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: String(error)
      });
    }
  });

  /**
   * GET /api/dashboard/interactions/:id
   * Get detailed interaction data
   */
  router.get('/interactions/:id', (req: Request, res: Response) => {
    try {
      const data = learning.getInteraction(req.params.id);

      if (!data) {
        return res.status(404).json({
          success: false,
          error: 'Interaction not found'
        });
      }

      res.json({
        success: true,
        data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: String(error)
      });
    }
  });

  /**
   * GET /api/dashboard/knowledge-base
   * Get knowledge base entries
   */
  router.get('/knowledge-base', async (_req: Request, res: Response) => {
    try {
      const entries = await kb.exportAsJSON();
      const stats = await kb.getStats();

      res.json({
        success: true,
        entries,
        stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: String(error)
      });
    }
  });

  /**
   * POST /api/dashboard/knowledge-base
   * Add knowledge base entry
   */
  router.post('/knowledge-base', async (req: Request, res: Response) => {
    try {
      const { category, question, answer, keywords } = req.body;

      if (!question || !answer) {
        return res.status(400).json({
          success: false,
          error: 'Question and answer are required'
        });
      }

      await kb.addEntry({
        category: category || 'General',
        question,
        answer,
        keywords: keywords || []
      });

      res.json({
        success: true,
        message: 'Entry added successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: String(error)
      });
    }
  });

  /**
   * PUT /api/dashboard/knowledge-base/:rowIndex
   * Update knowledge base entry
   */
  router.put('/knowledge-base/:rowIndex', async (req: Request, res: Response) => {
    try {
      const rowIndex = parseInt(req.params.rowIndex, 10);
      const { category, question, answer, keywords } = req.body;

      await kb.updateEntry(rowIndex, {
        category,
        question,
        answer,
        keywords
      });

      res.json({
        success: true,
        message: 'Entry updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: String(error)
      });
    }
  });

  /**
   * POST /api/dashboard/knowledge-base/sync
   * Manually sync knowledge base from Google Sheet
   */
  router.post('/knowledge-base/sync', async (_req: Request, res: Response) => {
    try {
      kb.clearCache();
      const entries = await kb.loadKnowledgeBase();

      learning.logAudit({
        action: 'kb_synced',
        resource_type: 'knowledge_base',
        details: JSON.stringify({ entries_count: entries.length })
      });

      res.json({
        success: true,
        entries_loaded: entries.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: String(error)
      });
    }
  });

  /**
   * GET /api/dashboard/audit-log
   * Get audit log entries
   */
  router.get('/audit-log', (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 100;

      // This would need to be implemented in LearningEngine
      // For now, return a placeholder
      res.json({
        success: true,
        audit_logs: [],
        note: 'Audit log endpoint needs full implementation'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: String(error)
      });
    }
  });

  /**
   * POST /api/dashboard/cleanup
   * Clean up old records (requires admin role)
   */
  router.post('/cleanup', (req: Request, res: Response) => {
    try {
      const daysToKeep = parseInt(req.body.days_to_keep as string, 10) || 90;
      const result = learning.cleanupOldRecords(daysToKeep);

      learning.logAudit({
        action: 'cleanup_performed',
        resource_type: 'system',
        details: JSON.stringify({ deleted_records: result.deleted })
      });

      res.json({
        success: true,
        deleted_records: result.deleted
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: String(error)
      });
    }
  });

  return router;
}
