import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsNumber, IsOptional, IsString, IsArray } from 'class-validator';
import { AiAssistService } from './ai-assist.service';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

class AskDto {
  @IsNumber() sc_id: number;
  @IsOptional() @IsString() budget_year?: string;
  @IsString() question: string;
}
class AdvisoryDto {
  @IsNumber() sc_id: number;
  @IsOptional() @IsString() budget_year?: string;
  @IsString() module: string;
  payload: Record<string, unknown>;
  @IsOptional() @IsArray() warnings?: { code: string; message: string }[];
}

@Controller('Ai_assist')
export class AiAssistController {
  constructor(private readonly service: AiAssistService) {}

  @Get('dailySummary/:sc_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  dailySummary(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('budget_year') budgetYear: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.service.dailySummary(scId, budgetYear);
  }

  @Get('weeklyDigest/:sc_id')
  @HttpCode(HttpStatus.OK)
  weeklyDigest(
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.service.weeklyDigest(scId);
  }

  @Post('advisory')
  @HttpCode(HttpStatus.OK)
  advisory(@Body() dto: AdvisoryDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.service.advisory(
      dto.sc_id,
      dto.budget_year ?? '',
      dto.module,
      dto.payload ?? {},
      dto.warnings ?? [],
    );
  }

  @Post('ask')
  @HttpCode(HttpStatus.OK)
  ask(@Body() dto: AskDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.service.ask(dto.sc_id, dto.budget_year ?? '', dto.question);
  }
}
