import { Router, Request, Response } from 'express';
import { PhoneService } from '../services/phone';
import { getLearningEngine } from '../services/learning';

export function createPhoneRouter(phoneService: PhoneService): Router {
  const router = Router();
  const learning = getLearningEngine();

  /**
   * POST /api/phone/incoming
   * Handle incoming Twilio call
   */
  router.post('/incoming', async (req: Request, res: Response) => {
    try {
      const { CallSid, From } = req.body;

      if (!CallSid || !From) {
        return res.status(400).json({
          success: false,
          error: 'Missing required Twilio parameters'
        });
      }

      // Generate TwiML response
      const twiml = await phoneService.handleIncomingCall(CallSid, From);

      // Set content type for TwiML
      res.type('application/xml');
      res.send(twiml);
    } catch (error) {
      console.error('Error handling incoming call:', error);
      res.status(500).json({
        success: false,
        error: String(error)
      });
    }
  });

  /**
   * POST /api/phone/gather
   * Process gathered input from customer
   */
  router.post('/gather', async (req: Request, res: Response) => {
    try {
      const { CallSid } = req.query;
      const { Digits, SpeechResult } = req.body;

      if (!CallSid) {
        return res.status(400).json({
          success: false,
          error: 'Missing CallSid'
        });
      }

      // Get customer input (either from digits or speech)
      const customerInput = SpeechResult || Digits || 'customer inquiry';

      if (customerInput === 'customer inquiry') {
        // Default message if no input
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>I'm sorry, I didn't hear that. Please try again.</Say>
  <Gather numDigits="1" timeout="10" action="/api/phone/gather?callSid=${CallSid}">
    <Say>Press any key or say your question.</Say>
  </Gather>
</Response>`;

        res.type('application/xml');
        return res.send(twiml);
      }

      // Generate response
      const response = await phoneService.generateResponse(CallSid as string, customerInput);

      // Create TwiML with response
      const speechTwiML = phoneService.generateSpeechTwiML(response);
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${speechTwiML}
  <Say>Thank you for calling. Goodbye.</Say>
  <Hangup/>
</Response>`;

      res.type('application/xml');
      res.send(twiml);
    } catch (error) {
      console.error('Error processing gathered input:', error);
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, I'm having trouble. Please try again later. Goodbye.</Say>
  <Hangup/>
</Response>`;

      res.type('application/xml');
      res.status(500).send(twiml);
    }
  });

  /**
   * POST /api/phone/status
   * Handle Twilio call status update
   */
  router.post('/status', async (req: Request, res: Response) => {
    try {
      const { CallSid, CallStatus, Duration, RecordingUrl } = req.body;

      if (!CallSid || !CallStatus) {
        return res.status(400).json({
          success: false,
          error: 'Missing required Twilio parameters'
        });
      }

      await phoneService.handleCallCompletion(
        CallSid,
        CallStatus,
        Duration ? parseInt(Duration, 10) : 0,
        RecordingUrl
      );

      // Log to audit
      learning.logAudit({
        action: 'phone_call_completed',
        resource_type: 'phone_call',
        resource_id: CallSid,
        details: JSON.stringify({
          status: CallStatus,
          duration: Duration
        })
      });

      res.json({
        success: true,
        message: 'Call status updated'
      });
    } catch (error) {
      console.error('Error processing call status:', error);
      res.status(500).json({
        success: false,
        error: String(error)
      });
    }
  });

  /**
   * GET /api/phone/status/:callSid
   * Get call status
   */
  router.get('/status/:callSid', async (req: Request, res: Response) => {
    try {
      const context = await phoneService.getCallStatus(req.params.callSid);

      if (!context) {
        return res.status(404).json({
          success: false,
          error: 'Call not found'
        });
      }

      res.json({
        success: true,
        call: {
          sid: context.callSid,
          from: context.from,
          status: context.callStatus,
          start_time: context.startTime,
          transcript: context.transcript
        }
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
