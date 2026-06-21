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
import { ProjectExtractService } from './services/project-extract.service';
import { AssistantCommandService } from './services/assistant-command.service';
import { AssistantBriefingService } from './services/assistant-briefing.service';
import { WorkAlertModule } from '../work-alert/work-alert.module';

@Module({
  imports: [ConfigModule, WorkAlertModule],
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
    ProjectExtractService,
    AssistantCommandService,
    AssistantBriefingService,
  ],
  exports: [AiRouterService, ChatService, ValidationService, AnalysisService],
})
export class AiModule {}
