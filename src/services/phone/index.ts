import twilio from 'twilio';
import { v4 as uuidv4 } from 'uuid';
import { getLearningEngine } from '../learning';
import { getLLMProvider } from '../llm';
import { KnowledgeBaseService } from '../knowledge-base';

export interface CallContext {
  callSid: string;
  from: string;
  to: string;
  callStatus: 'inbound' | 'ringing' | 'in-progress' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  transcript?: string;
  recordingUrl?: string;
}

export class PhoneService {
  private twilioClient: ReturnType<typeof twilio>;
  private accountSid: string;
  private authToken: string;
  private twilioPhoneNumber: string;
  private knowledgeBase: KnowledgeBaseService;
  private callContexts: Map<string, CallContext> = new Map();

  constructor(
    accountSid: string,
    authToken: string,
    twilioPhoneNumber: string,
    knowledgeBase: KnowledgeBaseService
  ) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.twilioPhoneNumber = twilioPhoneNumber;
    this.knowledgeBase = knowledgeBase;
    this.twilioClient = twilio(accountSid, authToken);
  }

  /**
   * Handle incoming call - generate TwiML response
   */
  async handleIncomingCall(callSid: string, from: string): Promise<string> {
    const context: CallContext = {
      callSid,
      from,
      to: this.twilioPhoneNumber,
      callStatus: 'inbound',
      startTime: Date.now()
    };

    this.callContexts.set(callSid, context);

    // Log the incoming call
    const learning = getLearningEngine();
    const interactionId = learning.logInteraction({
      interaction_type: 'phone',
      customer_phone: from,
      incoming_message: `Incoming call from ${from}`,
      generated_response: '', // Will be filled in when we generate response
      llm_provider: process.env.LLM_PRIMARY_PROVIDER || 'ollama'
    });

    learning.logPhoneCall({
      twilio_call_sid: callSid,
      interaction_id: interactionId,
      customer_phone: from,
      call_status: 'inbound'
    });

    // Generate greeting
    const greeting = this.generateGreeting();

    // Return TwiML for greeting and gathering customer input
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${greeting}</Say>
  <Gather numDigits="1" timeout="10" action="/api/phone/gather?callSid=${callSid}">
    <Say>Press any key to continue or say your question.</Say>
  </Gather>
  <Say>Thank you for contacting us. Goodbye.</Say>
  <Hangup/>
</Response>`;

    return twimlResponse;
  }

  /**
   * Process customer input and generate response
   */
  async generateResponse(callSid: string, customerInput: string): Promise<string> {
    const context = this.callContexts.get(callSid);
    if (!context) {
      throw new Error('Call context not found');
    }

    try {
      // Find relevant KB entries
      const relevantEntries = await this.knowledgeBase.findRelevantEntries(
        customerInput,
        3
      );

      const kbContext = relevantEntries
        .map(e => `Q: ${e.question}\nA: ${e.answer}`)
        .join('\n\n');

      // Generate response via LLM
      const llm = getLLMProvider();
      const llmResponse = await llm.generateResponse(customerInput, kbContext, {
        tone: 'friendly' // Phone calls are more casual
      });

      // Update context
      context.transcript = customerInput;

      // Log interaction
      const learning = getLearningEngine();
      const interactionId = learning.logInteraction({
        interaction_type: 'phone',
        customer_phone: context.from,
        incoming_message: customerInput,
        generated_response: llmResponse.content,
        knowledge_base_sources: JSON.stringify(relevantEntries.map(e => e.id)),
        llm_model: llmResponse.model,
        llm_provider: llmResponse.provider
      });

      // Update phone call log
      learning.logPhoneCall({
        twilio_call_sid: callSid,
        interaction_id: interactionId,
        customer_phone: context.from,
        call_status: 'in-progress',
        transcript: `Customer: ${customerInput}\nAgent: ${llmResponse.content}`
      });

      return llmResponse.content;
    } catch (error) {
      console.error('Error generating phone response:', error);
      throw error;
    }
  }

  /**
   * Handle call completion and logging
   */
  async handleCallCompletion(
    callSid: string,
    callStatus: string,
    duration: number,
    recordingUrl?: string
  ): Promise<void> {
    const context = this.callContexts.get(callSid);
    if (!context) {
      return;
    }

    context.callStatus = callStatus as any;
    context.endTime = Date.now();
    context.recordingUrl = recordingUrl;

    // Log completion
    const learning = getLearningEngine();
    learning.logPhoneCall({
      twilio_call_sid: callSid,
      interaction_id: '', // Note: This should come from the earlier interaction
      customer_phone: context.from,
      call_status: callStatus,
      call_duration_seconds: duration,
      recording_url: recordingUrl,
      transcript: context.transcript
    });

    // Clean up
    this.callContexts.delete(callSid);
  }

  /**
   * Get call status
   */
  async getCallStatus(callSid: string): Promise<CallContext | null> {
    return this.callContexts.get(callSid) || null;
  }

  /**
   * Generate a greeting message
   */
  private generateGreeting(): string {
    return 'Hello! Thank you for calling. How can we help you today?';
  }

  /**
   * Speak text via Twilio TTS
   */
  generateSpeechTwiML(text: string): string {
    return `<Say voice="alice" language="en-US">${this.escapeTwiML(text)}</Say>`;
  }

  /**
   * Escape text for TwiML
   */
  private escapeTwiML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

/**
 * Create phone service instance
 */
export async function createPhoneService(
  accountSid: string,
  authToken: string,
  twilioPhoneNumber: string,
  knowledgeBase: KnowledgeBaseService
): Promise<PhoneService> {
  const service = new PhoneService(accountSid, authToken, twilioPhoneNumber, knowledgeBase);
  console.log('Phone Service initialized successfully');
  return service;
}
