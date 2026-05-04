import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  Content,
} from '@google/generative-ai';
import {
  AiProvider,
  AiResponse,
  AiTool,
  ChatMessage,
} from './ai-provider.interface';

@Injectable()
export class GeminiProvider implements AiProvider {
  readonly name = 'gemini' as const;
  private readonly logger = new Logger(GeminiProvider.name);
  private client: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;
  private modelName: string;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    this.modelName =
      this.config.get<string>('GEMINI_MODEL') || 'gemini-2.0-flash';

    if (apiKey) {
      this.client = new GoogleGenerativeAI(apiKey);
      this.model = this.client.getGenerativeModel({ model: this.modelName });
      this.logger.log(`Gemini provider initialized (model: ${this.modelName})`);
    } else {
      this.logger.warn('GEMINI_API_KEY not set — Gemini provider disabled');
    }
  }

  async isAvailable(): Promise<boolean> {
    return this.client !== null && this.model !== null;
  }

  async chat(
    messages: ChatMessage[],
    systemPrompt: string,
    _tools?: AiTool[],
  ): Promise<AiResponse> {
    if (!this.model) throw new Error('Gemini provider not available');

    // แปลง ChatMessage[] → Gemini Content format
    const contents: Content[] = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const result = await this.model.generateContent({
      contents,
      systemInstruction: { role: 'user', parts: [{ text: systemPrompt }] },
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 4096,
      },
    });

    const response = result.response;
    const text = response.text();
    const usage = response.usageMetadata;

    return {
      content: text,
      provider: 'gemini',
      model: this.modelName,
      tokensUsed: usage
        ? (usage.promptTokenCount ?? 0) + (usage.candidatesTokenCount ?? 0)
        : undefined,
    };
  }

  async *chatStream(
    messages: ChatMessage[],
    systemPrompt: string,
  ): AsyncGenerator<string> {
    if (!this.model) throw new Error('Gemini provider not available');

    const contents: Content[] = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const result = await this.model.generateContentStream({
      contents,
      systemInstruction: { role: 'user', parts: [{ text: systemPrompt }] },
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 4096,
      },
    });

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
  }
}
