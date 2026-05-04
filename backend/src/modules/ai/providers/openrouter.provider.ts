import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiProvider,
  AiResponse,
  AiTool,
  ChatMessage,
} from './ai-provider.interface';

interface OpenRouterChoice {
  message?: { content?: string };
  delta?: { content?: string };
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[];
  usage?: { total_tokens?: number };
}

@Injectable()
export class OpenRouterProvider implements AiProvider {
  readonly name = 'openrouter' as const;
  private readonly logger = new Logger(OpenRouterProvider.name);
  private readonly apiKey: string | undefined;
  private readonly modelName: string;
  private readonly baseUrl: string;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('OPENROUTER_API_KEY');
    this.modelName =
      this.config.get<string>('OPENROUTER_MODEL') || 'google/gemini-2.5-flash';
    this.baseUrl =
      this.config.get<string>('OPENROUTER_BASE_URL') ||
      'https://openrouter.ai/api/v1';

    if (this.apiKey) {
      this.logger.log(
        `OpenRouter provider initialized (model: ${this.modelName})`,
      );
    } else {
      this.logger.warn(
        'OPENROUTER_API_KEY not set — OpenRouter provider disabled',
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3001',
      'X-Title': 'SFMIS',
    };
  }

  private buildBody(
    messages: ChatMessage[],
    systemPrompt: string,
    stream: boolean,
  ) {
    return {
      model: this.modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.7,
      top_p: 0.95,
      max_tokens: 4096,
      stream,
    };
  }

  async chat(
    messages: ChatMessage[],
    systemPrompt: string,
    _tools?: AiTool[],
  ): Promise<AiResponse> {
    if (!this.apiKey) throw new Error('OpenRouter provider not available');

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(this.buildBody(messages, systemPrompt, false)),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenRouter ${res.status}: ${errText.slice(0, 300)}`);
    }

    const data = (await res.json()) as OpenRouterResponse;
    const content = data.choices?.[0]?.message?.content ?? '';

    return {
      content,
      provider: 'openrouter',
      model: this.modelName,
      tokensUsed: data.usage?.total_tokens,
    };
  }

  async *chatStream(
    messages: ChatMessage[],
    systemPrompt: string,
  ): AsyncGenerator<string> {
    if (!this.apiKey) throw new Error('OpenRouter provider not available');

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(this.buildBody(messages, systemPrompt, true)),
    });

    if (!res.ok || !res.body) {
      const errText = await res.text();
      throw new Error(`OpenRouter ${res.status}: ${errText.slice(0, 300)}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') {
          if (data === '[DONE]') return;
          continue;
        }
        try {
          const parsed = JSON.parse(data) as OpenRouterResponse;
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          // skip malformed JSON
        }
      }
    }
  }
}
