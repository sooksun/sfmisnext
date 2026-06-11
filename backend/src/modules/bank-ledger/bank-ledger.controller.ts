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
import { BankLedgerService } from './bank-ledger.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@UseGuards(RolesGuard)
@Controller('BankLedger')
export class BankLedgerController {
  constructor(private readonly bankLedgerService: BankLedgerService) {}

  @Get('loadLedger/:sc_id/:sy_id/:ba_id')
  @HttpCode(HttpStatus.OK)
  loadLedger(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('ba_id', ParseIntPipe) baId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.bankLedgerService.loadLedger(scId, syId, baId);
  }

  @Get('getAccountBalance/:sc_id/:sy_id/:ba_id')
  @HttpCode(HttpStatus.OK)
  getAccountBalance(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('ba_id', ParseIntPipe) baId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.bankLedgerService.getAccountBalance(scId, syId, baId);
  }

  @Get('getAllAccountBalances/:sc_id/:sy_id')
  @HttpCode(HttpStatus.OK)
  getAllAccountBalances(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.bankLedgerService.getAllAccountBalances(scId, syId);
  }

  @Post('addEntry')
  @HttpCode(HttpStatus.OK)
  @Roles(1, 2, 5, 8)
  addEntry(
    @Body()
    dto: {
      sc_id: number;
      sy_id: number;
      ba_id: number;
      entry_type: number;
      doc_no?: string;
      entry_date?: string;
      detail?: string;
      amount: number;
      ref_type?: string;
      ref_id?: number;
      signer_id?: number;
      note?: string;
      up_by?: number;
    },
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, dto.sc_id);
    return this.bankLedgerService.addEntry(dto);
  }

  @Post('updateEntry/:ble_id')
  @HttpCode(HttpStatus.OK)
  @Roles(1, 2, 5, 8)
  updateEntry(
    @Param('ble_id', ParseIntPipe) bleId: number,
    @Body()
    dto: {
      entry_type?: number;
      doc_no?: string;
      entry_date?: string;
      detail?: string;
      amount?: number;
      note?: string;
      up_by?: number;
    },
    @CurrentUser() user: JwtUser,
  ) {
    return this.bankLedgerService.updateEntry(bleId, dto, user);
  }

  @Post('removeEntry')
  @HttpCode(HttpStatus.OK)
  @Roles(1, 2, 5, 8)
  removeEntry(
    @Body() dto: { ble_id: number; up_by: number; reason?: string },
    @CurrentUser() user: JwtUser,
  ) {
    return this.bankLedgerService.removeEntry(
      dto.ble_id,
      dto.up_by,
      dto.reason,
      user,
    );
  }
}
