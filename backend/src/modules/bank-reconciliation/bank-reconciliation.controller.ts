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
  ) {
    return this.bankReconciliationService.loadReconciliations(scId, baId);
  }

  /** โหลดรายละเอียดงบเทียบยอด พร้อมรายการปรับปรุง */
  @Get('loadDetail/:br_id')
  @HttpCode(HttpStatus.OK)
  loadDetail(@Param('br_id', ParseIntPipe) brId: number) {
    return this.bankReconciliationService.loadDetail(brId);
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
  ) {
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
  ) {
    return this.bankReconciliationService.addItem(dto);
  }

  /** ลบ (soft delete) รายการปรับปรุง */
  @Post('removeItem')
  @HttpCode(HttpStatus.OK)
  removeItem(@Body() dto: { bri_id: number; up_by: number }) {
    return this.bankReconciliationService.removeItem(dto.bri_id, dto.up_by);
  }

  /** ผู้อำนวยการลงนามรับรองงบเทียบยอด */
  @Post('signOff')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(1, 2)
  signOff(@Body() dto: { br_id: number; signed_by: number; note?: string }) {
    return this.bankReconciliationService.signOff(dto);
  }
}
