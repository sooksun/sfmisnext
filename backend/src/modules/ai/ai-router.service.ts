import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiProvider } from './providers/gemini.provider';
import { OllamaProvider } from './providers/ollama.provider';
import { OpenRouterProvider } from './providers/openrouter.provider';
import {
  AiProvider,
  AiResponse,
  AiTaskComplexity,
  AiTaskType,
  AiTool,
  ChatMessage,
} from './providers/ai-provider.interface';

/**
 * AI Router — เลือก provider ตาม AI_DEFAULT_PROVIDER + ความซับซ้อนของงาน
 * Default chain (ถ้า provider ที่เลือกไม่พร้อม):
 *   openrouter → gemini → ollama
 */
@Injectable()
export class AiRouterService {
  private readonly logger = new Logger(AiRouterService.name);
  private readonly defaultProvider: string;

  constructor(
    private readonly gemini: GeminiProvider,
    private readonly ollama: OllamaProvider,
    private readonly openrouter: OpenRouterProvider,
    private readonly config: ConfigService,
  ) {
    this.defaultProvider = (
      this.config.get<string>('AI_DEFAULT_PROVIDER') || 'openrouter'
    ).toLowerCase();
    this.logger.log(`Default AI provider: ${this.defaultProvider}`);
  }

  /** กำหนดความซับซ้อนตามประเภทงาน */
  private getComplexity(taskType: AiTaskType): AiTaskComplexity {
    switch (taskType) {
      case 'chat':
      case 'analyze':
      case 'merge':
        return 'complex';
      case 'validate':
      case 'classify':
        return 'simple';
      default:
        return 'complex';
    }
  }

  /** map ชื่อ provider → instance */
  private byName(name: string): AiProvider | null {
    switch (name) {
      case 'openrouter':
        return this.openrouter;
      case 'gemini':
        return this.gemini;
      case 'ollama':
        return this.ollama;
      default:
        return null;
    }
  }

  /** เลือก provider ที่เหมาะสม */
  async selectProvider(taskType: AiTaskType): Promise<AiProvider> {
    const complexity = this.getComplexity(taskType);

    // 1) Simple tasks → ลอง Ollama ก่อน (local, ฟรี)
    if (complexity === 'simple' && (await this.ollama.isAvailable())) {
      this.logger.debug(`Task "${taskType}" → Ollama (simple/local)`);
      return this.ollama;
    }

    // 2) ใช้ default provider
    const def = this.byName(this.defaultProvider);
    if (def && (await def.isAvailable())) {
      this.logger.debug(`Task "${taskType}" → ${def.name} (default)`);
      return def;
    }

    // 3) Fallback chain
    const chain: AiProvider[] = [this.openrouter, this.gemini, this.ollama];
    for (const p of chain) {
      if (p === def) continue;
      if (await p.isAvailable()) {
        this.logger.warn(
          `Default "${this.defaultProvider}" unavailable — falling back to ${p.name}`,
        );
        return p;
      }
    }

    throw new Error(
      'ไม่มี AI provider ที่พร้อมใช้งาน — ตรวจสอบ OPENROUTER_API_KEY, GEMINI_API_KEY หรือ Ollama',
    );
  }

  /** เรียก AI chat ตามประเภทงาน */
  async chat(
    taskType: AiTaskType,
    messages: ChatMessage[],
    systemPrompt: string,
    tools?: AiTool[],
  ): Promise<AiResponse> {
    const provider = await this.selectProvider(taskType);
    return provider.chat(messages, systemPrompt, tools);
  }

  /** เรียก AI chat แบบ streaming */
  async *chatStream(
    taskType: AiTaskType,
    messages: ChatMessage[],
    systemPrompt: string,
  ): AsyncGenerator<string> {
    const provider = await this.selectProvider(taskType);
    yield* provider.chatStream(messages, systemPrompt);
  }

  /** ดูสถานะ providers */
  async getStatus(): Promise<{
    openrouter: boolean;
    gemini: boolean;
    ollama: boolean;
    default: string;
  }> {
    const [openrouterOk, geminiOk, ollamaOk] = await Promise.all([
      this.openrouter.isAvailable(),
      this.gemini.isAvailable(),
      this.ollama.isAvailable(),
    ]);
    return {
      openrouter: openrouterOk,
      gemini: geminiOk,
      ollama: ollamaOk,
      default: this.defaultProvider,
    };
  }
}
