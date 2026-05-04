import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ollama } from 'ollama';
import {
  AiProvider,
  AiResponse,
  AiTool,
  ChatMessage,
} from './ai-provider.interface';

@Injectable()
export class OllamaProvider implements AiProvider {
  readonly name = 'ollama' as const;
  private readonly logger = new Logger(OllamaProvider.name);
  private client: Ollama;
  private modelName: string;
  private baseUrl: string;

  constructor(private config: ConfigService) {
    this.baseUrl =
      this.config.get<string>('OLLAMA_BASE_URL') || 'http://localhost:11434';
    this.modelName = this.config.get<string>('OLLAMA_MODEL') || 'llama3.1:8b';

    this.client = new Ollama({ host: this.baseUrl });
    this.logger.log(
      `Ollama provider initialized (url: ${this.baseUrl}, model: ${this.modelName})`,
    );
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.list();
      return true;
    } catch {
      return false;
    }
  }

  async chat(
    messages: ChatMessage[],
    systemPrompt: string,
    _tools?: AiTool[],
  ): Promise<AiResponse> {
    const ollamaMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const response = await this.client.chat({
      model: this.modelName,
      messages: ollamaMessages,
      options: {
        temperature: 0.7,
        top_p: 0.95,
        num_predict: 2048,
      },
    });

    return {
      content: response.message.content,
      provider: 'ollama',
      model: this.modelName,
      tokensUsed: response.eval_count,
    };
  }

  async *chatStream(
    messages: ChatMessage[],
    systemPrompt: string,
  ): AsyncGenerator<string> {
    const ollamaMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const response = await this.client.chat({
      model: this.modelName,
      messages: ollamaMessages,
      stream: true,
      options: {
        temperature: 0.7,
        top_p: 0.95,
        num_predict: 2048,
      },
    });

    for await (const chunk of response) {
      if (chunk.message?.content) {
        yield chunk.message.content;
      }
    }
  }
}
