import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiRouterService } from './ai-router.service';
import { GeminiProvider } from './providers/gemini.provider';
import { OllamaProvider } from './providers/ollama.provider';
import { OpenRouterProvider } from './providers/openrouter.provider';
import { ChatService } from './services/chat.service';
import { ValidationService } from './services/validation.service';
import { AnalysisService } from './services/analysis.service';
import { MergeService } from './services/merge.service';

@Module({
  imports: [ConfigModule],
  controllers: [AiController],
  providers: [
    // AI Providers
    OpenRouterProvider,
    GeminiProvider,
    OllamaProvider,
    AiRouterService,
    // Feature Services
    ChatService,
    ValidationService,
    AnalysisService,
    MergeService,
  ],
  exports: [AiRouterService, ChatService, ValidationService, AnalysisService],
})
export class AiModule {}
