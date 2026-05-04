import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LoanAgreementService } from './loan-agreement.service';
import { AddLoanAgreementDto } from './dto/add-loan-agreement.dto';

@Controller('LoanAgreement')
export class LoanAgreementController {
  constructor(private readonly loanAgreementService: LoanAgreementService) {}

  @Get('loadLoanAgreements/:sc_id/:sy_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  loadLoanAgreements(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('budget_year') budgetYear: string,
  ) {
    return this.loanAgreementService.loadLoanAgreements(scId, syId, budgetYear);
  }

  @Post('addLoanAgreement')
  @HttpCode(HttpStatus.OK)
  addLoanAgreement(@Body() dto: AddLoanAgreementDto) {
    return this.loanAgreementService.addLoanAgreement(dto);
  }

  @Post('returnLoan')
  @HttpCode(HttpStatus.OK)
  returnLoan(
    @Body()
    dto: {
      la_id: number;
      returned_date: string;
      return_cash: number;
      return_voucher_amount: number;
      evidence_no?: string;
      note?: string;
      up_by?: number;
    },
  ) {
    return this.loanAgreementService.returnLoan(dto);
  }

  @Post('cancelLoan')
  @HttpCode(HttpStatus.OK)
  cancelLoan(@Body() dto: { la_id: number; note?: string; up_by: number }) {
    return this.loanAgreementService.cancelLoan(
      dto.la_id,
      dto.note ?? '',
      dto.up_by,
    );
  }

  @Get('loadEvidence/:la_id')
  @HttpCode(HttpStatus.OK)
  loadEvidence(@Param('la_id', ParseIntPipe) laId: number) {
    return this.loanAgreementService.loadEvidence(laId);
  }
}
