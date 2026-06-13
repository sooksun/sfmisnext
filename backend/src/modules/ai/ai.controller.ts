import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Res,
  ParseIntPipe,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { AiRouterService } from './ai-router.service';
import { ChatService, ChatContext } from './services/chat.service';
import { ValidationService } from './services/validation.service';
import { AnalysisService } from './services/analysis.service';
import { MergeService } from './services/merge.service';
import { CrossDomainGuardService } from '../cross-domain-guard/cross-domain-guard.service';
import { ChatRequestDto } from './dto/chat.dto';
import {
  ValidateTransactionDto,
  ValidateBudgetDto,
} from './dto/validation.dto';
import {
  AnalyzeMonthlyDto,
  AnalyzeBudgetUtilizationDto,
  AnalyzeSpendingTrendDto,
} from './dto/analysis.dto';
import { MergeExcelImportDto, MergeReconcileDto } from './dto/merge.dto';
import { ParseProjectDto } from './dto/parse-project.dto';
import { ProjectExtractService } from './services/project-extract.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

/**
 * AI endpoints — multi-tenant guarded + rate-limited
 *
 * Rate limit: 30 calls/min/user (configured in app.module 'ai' limiter)
 * → ป้องกัน Gemini cost spike จาก single-user spam
 */
@Controller('ai')
@UseGuards(ThrottlerGuard, RolesGuard)
@Roles(1, 2, 3, 4, 5, 6, 7, 8)
@Throttle({ ai: { limit: 30, ttl: 60000 } })
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(
    private readonly router: AiRouterService,
    private readonly chatService: ChatService,
    private readonly validationService: ValidationService,
    private readonly analysisService: AnalysisService,
    private readonly mergeService: MergeService,
    private readonly crossDomainGuard: CrossDomainGuardService,
    private readonly projectExtractService: ProjectExtractService,
  ) {}

  /** สร้าง ChatContext จาก DTO */
  private buildChatContext(dto: ChatRequestDto): ChatContext {
    return {
      scId: dto.sc_id,
      scName: dto.sc_name,
      budgetYear: dto.budget_year,
      contextPage: dto.context,
    };
  }

  // ═══════════════════════════════════════════════════
  // สถานะ AI
  // ═══════════════════════════════════════════════════

  @Get('status')
  async getStatus() {
    const status = await this.router.getStatus();
    return { flag: true, data: status };
  }

  // ═══════════════════════════════════════════════════
  // สกัดข้อมูลโครงการจากข้อความ (สร้างโครงการด้วย AI)
  // ═══════════════════════════════════════════════════

  @Post('parse-project')
  @HttpCode(HttpStatus.OK)
  async parseProject(
    @Body() dto: ParseProjectDto,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, dto.sc_id);
    return this.projectExtractService.parse(dto);
  }

  // ═══════════════════════════════════════════════════
  // Chat
  // ═══════════════════════════════════════════════════

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(@Body() dto: ChatRequestDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    // ไม่ log เนื้อหาผู้ใช้ — กัน PII leak (เลขบัตร, password ฯลฯ)
    this.logger.debug(`Chat received (length: ${dto.message.length})`);
    const ctx = this.buildChatContext(dto);
    const result = await this.chatService.chat(dto, ctx);
    return {
      flag: true,
      data: {
        content: result.content,
        provider: result.provider,
        model: result.model,
      },
    };
  }

  @Post('chat/stream')
  @HttpCode(HttpStatus.OK)
  async chatStream(
    @Body() dto: ChatRequestDto,
    @CurrentUser() user: JwtUser,
    @Res() res: Response,
  ) {
    assertSameSchool(user, dto.sc_id);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const ctx = this.buildChatContext(dto);

    try {
      for await (const chunk of this.chatService.streamChat(dto, ctx)) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
      res.write(`data: [DONE]\n\n`);
    } catch (error) {
      this.logger.error('Stream error', error);
      res.write(
        `data: ${JSON.stringify({ error: 'เกิดข้อผิดพลาดในการสร้างคำตอบ' })}\n\n`,
      );
    } finally {
      res.end();
    }
  }

  // ═══════════════════════════════════════════════════
  // Validation — ตรวจสอบข้อมูลผิดปกติ
  // ═══════════════════════════════════════════════════

  @Get('validate/alerts/:scId/:budgetYear')
  async getAlerts(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('budgetYear') budgetYear: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    const alerts = await this.validationService.getAlerts(scId, budgetYear);
    return {
      flag: true,
      data: alerts,
      count: alerts.length,
    };
  }

  @Post('validate/transaction')
  @HttpCode(HttpStatus.OK)
  async validateTransaction(
    @Body() dto: ValidateTransactionDto,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, dto.sc_id);
    const alerts = await this.validationService.getAlerts(
      dto.sc_id,
      dto.budget_year,
    );
    return { flag: true, data: alerts, count: alerts.length };
  }

  /**
   * เตือนสดที่จุดกรอกข้อมูล (inline) — rule-based ล้วน ไม่เรียก LLM เพื่อ latency ต่ำ
   *   context='order'   payload: { sc_id, project_id, amount, exclude_order_id? }
   *   context='invoice' payload: { sc_id, order_id }
   */
  @Post('validate/entry')
  @HttpCode(HttpStatus.OK)
  async validateEntry(
    @Body()
    body: {
      context: 'order' | 'invoice';
      sc_id: number;
      project_id?: number;
      amount?: number;
      exclude_order_id?: number;
      order_id?: number;
    },
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, body.sc_id);
    let alerts: Awaited<ReturnType<CrossDomainGuardService['inspect']>> = [];
    if (body.context === 'order') {
      alerts = await this.crossDomainGuard.previewParcelOrder({
        scId: body.sc_id,
        projectId: body.project_id,
        newAmount: Number(body.amount ?? 0),
        excludeOrderId: body.exclude_order_id,
      });
    } else if (body.context === 'invoice') {
      alerts = await this.crossDomainGuard.previewInvoice({
        scId: body.sc_id,
        orderId: body.order_id,
      });
    }
    return { flag: true, data: alerts, count: alerts.length };
  }

  @Post('validate/budget')
  @HttpCode(HttpStatus.OK)
  async validateBudget(
    @Body() dto: ValidateBudgetDto,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, dto.sc_id);
    const alerts = await this.validationService.getAlerts(
      dto.sc_id,
      dto.budget_year,
    );
    const budgetAlerts = alerts.filter((a) => a.type.startsWith('budget'));
    return { flag: true, data: budgetAlerts, count: budgetAlerts.length };
  }

  // ═══════════════════════════════════════════════════
  // Analysis — วิเคราะห์รายงาน
  // ═══════════════════════════════════════════════════

  @Post('analyze/monthly-summary')
  @HttpCode(HttpStatus.OK)
  async analyzeMonthly(
    @Body() dto: AnalyzeMonthlyDto,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, dto.sc_id);
    const result = await this.analysisService.analyzeMonthly(
      dto.sc_id,
      dto.budget_year,
      dto.month,
    );
    return { flag: true, data: result };
  }

  @Post('analyze/budget-utilization')
  @HttpCode(HttpStatus.OK)
  async analyzeBudgetUtilization(
    @Body() dto: AnalyzeBudgetUtilizationDto,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, dto.sc_id);
    const result = await this.analysisService.analyzeBudgetUtilization(
      dto.sc_id,
      dto.sy_id,
      dto.budget_year,
    );
    return { flag: true, data: result };
  }

  @Post('analyze/spending-trend')
  @HttpCode(HttpStatus.OK)
  async analyzeSpendingTrend(
    @Body() dto: AnalyzeSpendingTrendDto,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, dto.sc_id);
    const result = await this.analysisService.analyzeSpendingTrend(
      dto.sc_id,
      dto.budget_year,
      dto.months || 6,
    );
    return { flag: true, data: result };
  }

  // ═══════════════════════════════════════════════════
  // Merge — รวมข้อมูล
  // ═══════════════════════════════════════════════════

  @Post('merge/excel-mapping')
  @HttpCode(HttpStatus.OK)
  async suggestMapping(
    @Body() dto: MergeExcelImportDto,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, dto.sc_id);
    const mapping = await this.mergeService.suggestColumnMapping(
      dto.headers,
      dto.target_table,
    );
    return { flag: true, data: mapping };
  }

  @Post('merge/reconcile')
  @HttpCode(HttpStatus.OK)
  async reconcile(
    @Body() dto: MergeReconcileDto,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, dto.sc_id);
    const result = await this.mergeService.reconcileEntries(
      dto.sc_id,
      dto.budget_year,
      dto.month,
      dto.bank_entries,
      dto.tolerance_days,
      dto.tolerance_amount,
    );
    return { flag: true, data: result };
  }
}
