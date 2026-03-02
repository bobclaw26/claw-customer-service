import express, { Express, Request, Response, NextFunction } from 'express';
import { google } from 'googleapis';
import { LearningEngine, initializeLearningEngine } from './services/learning';
import { LLMProvider, createProviderFromEnv } from './services/llm';
import { EmailService, createEmailService } from './services/email';
import { PhoneService, createPhoneService } from './services/phone';
import { KnowledgeBaseService, createKnowledgeBaseService } from './services/knowledge-base';
import { createEmailRouter } from './routes/email';
import { createPhoneRouter } from './routes/phone';
import { createDashboardRouter } from './routes/dashboard';

export interface AppConfig {
  port?: number;
  googleOAuthToken?: string;
  spreadsheetId?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
}

export class ClawCustomerService {
  private app: Express;
  private config: AppConfig;
  private learning: LearningEngine | null = null;
  private llm: LLMProvider | null = null;
  private emailService: EmailService | null = null;
  private phoneService: PhoneService | null = null;
  private knowledgeBase: KnowledgeBaseService | null = null;

  constructor(config: AppConfig = {}) {
    this.config = {
      port: config.port || 3000,
      ...config
    };

    this.app = express();
    this.setupMiddleware();
  }

  private setupMiddleware(): void {
    // Parse JSON
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // CORS
    this.app.use((_req: Request, res: Response, next: NextFunction) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id');
      next();
    });

    // Logging
    this.app.use((req: Request, _res: Response, next: NextFunction) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      next();
    });
  }

  async initialize(): Promise<void> {
    console.log('Initializing Claw Customer Service...');

    // Initialize Learning Engine
    console.log('Initializing Learning Engine...');
    this.learning = initializeLearningEngine();

    // Initialize LLM Provider
    console.log('Initializing LLM Provider...');
    this.llm = createProviderFromEnv();

    // Initialize Google APIs
    console.log('Initializing Google APIs...');
    const auth = new google.auth.OAuth2({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUrl: process.env.GOOGLE_REDIRECT_URL
    });

    const token = process.env.GOOGLE_OAUTH_TOKEN;
    if (token) {
      auth.setCredentials(JSON.parse(token));
    } else {
      console.warn('GOOGLE_OAUTH_TOKEN not set - some features will not work');
    }

    const gmail = google.gmail({ version: 'v1', auth });
    const sheets = google.sheets({ version: 'v4', auth });

    // Initialize Knowledge Base
    if (this.config.spreadsheetId) {
      console.log('Initializing Knowledge Base Service...');
      this.knowledgeBase = await createKnowledgeBaseService(sheets, this.config.spreadsheetId);
    } else {
      console.warn('SPREADSHEET_ID not set - Knowledge Base features disabled');
    }

    // Initialize Email Service
    if (this.knowledgeBase) {
      console.log('Initializing Email Service...');
      this.emailService = await createEmailService(gmail, this.knowledgeBase);
    }

    // Initialize Phone Service
    if (
      this.knowledgeBase &&
      this.config.twilioAccountSid &&
      this.config.twilioAuthToken &&
      this.config.twilioPhoneNumber
    ) {
      console.log('Initializing Phone Service...');
      this.phoneService = await createPhoneService(
        this.config.twilioAccountSid,
        this.config.twilioAuthToken,
        this.config.twilioPhoneNumber,
        this.knowledgeBase
      );
    } else {
      console.warn('Twilio configuration incomplete - Phone Service disabled');
    }

    this.setupRoutes();
    this.setupHealthCheck();
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({
        status: 'ok',
        timestamp: Date.now(),
        services: {
          learning: this.learning ? 'ready' : 'not_initialized',
          llm: this.llm ? 'ready' : 'not_initialized',
          email: this.emailService ? 'ready' : 'disabled',
          phone: this.phoneService ? 'ready' : 'disabled',
          knowledge_base: this.knowledgeBase ? 'ready' : 'disabled'
        }
      });
    });

    // Email routes
    if (this.emailService) {
      this.app.use('/api/email', createEmailRouter(this.emailService));
    }

    // Phone routes
    if (this.phoneService) {
      this.app.use('/api/phone', createPhoneRouter(this.phoneService));
    }

    // Dashboard routes
    if (this.knowledgeBase) {
      this.app.use('/api/dashboard', createDashboardRouter(this.knowledgeBase));
    }

    // 404 handler
    this.app.use((_req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: 'Not found'
      });
    });

    // Error handler
    this.app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Error:', err);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    });
  }

  private setupHealthCheck(): void {
    // Periodic health check and maintenance
    setInterval(() => {
      if (this.learning) {
        // Clean up old records weekly
        this.learning.cleanupOldRecords(90);
      }

      if (this.knowledgeBase) {
        // Refresh KB cache periodically
        this.knowledgeBase.clearCache();
      }
    }, 7 * 24 * 60 * 60 * 1000); // Weekly
  }

  start(): void {
    const port = this.config.port || 3000;

    this.app.listen(port, () => {
      console.log(`🦁 Claw Customer Service running on port ${port}`);
      console.log(`📊 Health check: http://localhost:${port}/health`);
    });
  }

  getApp(): Express {
    return this.app;
  }
}

/**
 * Create and start the application
 */
export async function createApp(config?: AppConfig): Promise<ClawCustomerService> {
  const app = new ClawCustomerService(config);
  await app.initialize();
  return app;
}

/**
 * Start the server (for CLI usage)
 */
export async function startServer(): Promise<void> {
  const config: AppConfig = {
    port: parseInt(process.env.PORT || '3000', 10),
    googleOAuthToken: process.env.GOOGLE_OAUTH_TOKEN,
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
    twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER
  };

  const app = await createApp(config);
  app.start();
}
