import fetch from 'node-fetch';

export interface LLMConfig {
  provider: 'ollama' | 'openai' | 'claude';
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  maxRetries?: number;
  timeoutMs?: number;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: string;
  tokens_used?: number;
  stop_reason?: string;
}

export class LLMProvider {
  private primaryConfig: LLMConfig;
  private fallbackConfigs: LLMConfig[] = [];

  constructor(primaryConfig: LLMConfig, fallbackConfigs?: LLMConfig[]) {
    this.primaryConfig = primaryConfig;
    this.fallbackConfigs = fallbackConfigs || [];
  }

  /**
   * Generate a customer service response
   */
  async generateResponse(
    incomingMessage: string,
    knowledgeBase: string,
    context: {
      customerName?: string;
      previousMessages?: string[];
      tone?: 'professional' | 'friendly' | 'technical';
    } = {}
  ): Promise<LLMResponse> {
    const systemPrompt = this.buildSystemPrompt(knowledgeBase, context.tone);
    const userPrompt = this.buildUserPrompt(incomingMessage, context);

    // Try primary provider first
    try {
      return await this.callLLM(this.primaryConfig, systemPrompt, userPrompt);
    } catch (error) {
      console.error(`Primary LLM provider failed: ${error}`);

      // Try fallback providers
      for (const config of this.fallbackConfigs) {
        try {
          console.log(`Attempting fallback to ${config.provider}`);
          return await this.callLLM(config, systemPrompt, userPrompt);
        } catch (fallbackError) {
          console.error(`Fallback provider ${config.provider} failed: ${fallbackError}`);
        }
      }

      throw new Error('All LLM providers failed', { cause: error });
    }
  }

  private async callLLM(
    config: LLMConfig,
    systemPrompt: string,
    userMessage: string
  ): Promise<LLMResponse> {
    switch (config.provider) {
      case 'ollama':
        return this.callOllama(config, systemPrompt, userMessage);
      case 'openai':
        return this.callOpenAI(config, systemPrompt, userMessage);
      case 'claude':
        return this.callClaude(config, systemPrompt, userMessage);
      default:
        throw new Error(`Unknown LLM provider: ${config.provider}`);
    }
  }

  private async callOllama(
    config: LLMConfig,
    systemPrompt: string,
    userMessage: string
  ): Promise<LLMResponse> {
    const baseUrl = config.baseUrl || 'http://localhost:11434';
    const model = config.model || 'llama2';
    const timeout = config.timeoutMs || 30000;

    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: `${systemPrompt}\n\nUser: ${userMessage}`,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 200
        }
      }),
      timeout
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as any;

    return {
      content: data.response.trim(),
      model,
      provider: 'ollama',
      tokens_used: data.eval_count
    };
  }

  private async callOpenAI(
    config: LLMConfig,
    systemPrompt: string,
    userMessage: string
  ): Promise<LLMResponse> {
    const model = config.model || 'gpt-3.5-turbo';
    const apiKey = config.apiKey;
    const timeout = config.timeoutMs || 30000;

    if (!apiKey) {
      throw new Error('OpenAI API key required');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 200
      }),
      timeout
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as any;

    return {
      content: data.choices[0].message.content,
      model,
      provider: 'openai',
      tokens_used: data.usage?.total_tokens,
      stop_reason: data.choices[0].finish_reason
    };
  }

  private async callClaude(
    config: LLMConfig,
    systemPrompt: string,
    userMessage: string
  ): Promise<LLMResponse> {
    const model = config.model || 'claude-3-sonnet-20240229';
    const apiKey = config.apiKey;
    const timeout = config.timeoutMs || 30000;

    if (!apiKey) {
      throw new Error('Claude API key required');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 200,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage }
        ]
      }),
      timeout
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as any;

    return {
      content: data.content[0].text,
      model,
      provider: 'claude',
      tokens_used: data.usage?.output_tokens,
      stop_reason: data.stop_reason
    };
  }

  private buildSystemPrompt(knowledgeBase: string, tone?: 'professional' | 'friendly' | 'technical'): string {
    const toneGuidance = this.getToneGuidance(tone || 'professional');

    return `You are a helpful customer service representative for a business. 
You have access to the following knowledge base:

${knowledgeBase}

${toneGuidance}

Important:
- Keep responses concise (2-3 sentences max)
- Only provide information from the knowledge base
- If you don't know the answer, offer to connect with support
- Be empathetic and professional
- Do NOT make up information or policies`;
  }

  private buildUserPrompt(message: string, context: any): string {
    let prompt = message;

    if (context.customerName) {
      prompt = `From customer ${context.customerName}: ${message}`;
    }

    if (context.previousMessages && context.previousMessages.length > 0) {
      prompt += '\n\nPrevious context:\n' + context.previousMessages.slice(-3).join('\n');
    }

    return prompt;
  }

  private getToneGuidance(tone: string): string {
    switch (tone) {
      case 'friendly':
        return 'Use a warm, friendly tone. Use casual language and emojis if appropriate.';
      case 'technical':
        return 'Use technical but clear language. Explain concepts thoroughly.';
      case 'professional':
      default:
        return 'Use a professional but warm tone. Be helpful and respectful.';
    }
  }
}

// Create a global provider instance
let provider: LLMProvider;

export function initializeLLMProvider(config: LLMConfig, fallbacks?: LLMConfig[]): LLMProvider {
  provider = new LLMProvider(config, fallbacks);
  return provider;
}

export function getLLMProvider(): LLMProvider {
  if (!provider) {
    throw new Error('LLM provider not initialized. Call initializeLLMProvider first.');
  }
  return provider;
}

/**
 * Create a provider from environment variables
 */
export function createProviderFromEnv(): LLMProvider {
  const primaryProvider = process.env.LLM_PRIMARY_PROVIDER || 'ollama';
  const primaryConfig: LLMConfig = {
    provider: primaryProvider as any,
    model: process.env.LLM_PRIMARY_MODEL,
    apiKey: process.env.LLM_PRIMARY_API_KEY,
    baseUrl: process.env.LLM_PRIMARY_BASE_URL
  };

  const fallbacks: LLMConfig[] = [];

  // Add fallback provider if configured
  if (process.env.LLM_FALLBACK_PROVIDER) {
    fallbacks.push({
      provider: process.env.LLM_FALLBACK_PROVIDER as any,
      model: process.env.LLM_FALLBACK_MODEL,
      apiKey: process.env.LLM_FALLBACK_API_KEY,
      baseUrl: process.env.LLM_FALLBACK_BASE_URL
    });
  }

  return initializeLLMProvider(primaryConfig, fallbacks);
}
