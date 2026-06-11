import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { BankReconciliationService } from './bank-reconciliation.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Controller('BankReconciliation')
export class BankReconciliationController {
  constructor(
    private readonly bankReconciliationService: BankReconciliationService,
  ) {}

  /** โหลดรายการงบเทียบยอดทั้งหมดของบัญชีธนาคารที่เลือก */
  @Get('loadReconciliations/:sc_id/:ba_id')
  @HttpCode(HttpStatus.OK)
  loadReconciliations(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('ba_id', ParseIntPipe) baId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.bankReconciliationService.loadReconciliations(scId, baId);
  }

  /** โหลดรายละเอียดงบเทียบยอด พร้อมรายการปรับปรุง */
  @Get('loadDetail/:br_id')
  @HttpCode(HttpStatus.OK)
  loadDetail(
    @Param('br_id', ParseIntPipe) brId: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.bankReconciliationService.loadDetail(brId, user);
  }

  /** สร้างหรืออัปเดตงบเทียบยอด (upsert ตาม sc_id + ba_id + recon_month) */
  @Post('createOrUpdate')
  @HttpCode(HttpStatus.OK)
  createOrUpdate(
    @Body()
    dto: {
      sc_id: number;
      ba_id: number;
      recon_month: string;
      book_balance: number;
      bank_statement_balance: number;
      note?: string;
      up_by?: number;
    },
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, Number(dto.sc_id));
    return this.bankReconciliationService.createOrUpdate(dto);
  }

  /** เพิ่มรายการปรับปรุง */
  @Post('addItem')
  @HttpCode(HttpStatus.OK)
  addItem(
    @Body()
    dto: {
      br_id: number;
      item_type: number;
      doc_ref?: string;
      detail?: string;
      amount: number;
      up_by?: number;
    },
    @CurrentUser() user: JwtUser,
  ) {
    return this.bankReconciliationService.addItem(dto, user);
  }

  /** ลบ (soft delete) รายการปรับปรุง */
  @Post('removeItem')
  @HttpCode(HttpStatus.OK)
  removeItem(
    @Body() dto: { bri_id: number; up_by: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.bankReconciliationService.removeItem(dto.bri_id, dto.up_by, user);
  }

  /** ผู้อำนวยการลงนามรับรองงบเทียบยอด */
  @Post('signOff')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(1, 2)
  signOff(
    @Body() dto: { br_id: number; signed_by: number; note?: string },
    @CurrentUser() user: JwtUser,
  ) {
    return this.bankReconciliationService.signOff(dto, user);
  }
}
