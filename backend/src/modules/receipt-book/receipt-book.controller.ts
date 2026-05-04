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
import { ReceiptBookService } from './receipt-book.service';
import {
  AddReceiptBookDto,
  CloseBookDto,
  VoidBookDto,
  AdvanceCurrentDto,
} from './dto/receipt-book.dto';

@Controller('ReceiptBook')
export class ReceiptBookController {
  constructor(private readonly receiptBookService: ReceiptBookService) {}

  @Get('loadBooks/:sc_id/:sy_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  loadBooks(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('budget_year') budgetYear: string,
  ) {
    return this.receiptBookService.loadBooks(scId, syId, budgetYear);
  }

  @Get('activeBook/:sc_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  getActiveBook(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('budget_year') budgetYear: string,
  ) {
    return this.receiptBookService.getActiveBook(scId, budgetYear);
  }

  @Post('addBook')
  @HttpCode(HttpStatus.OK)
  addBook(@Body() dto: AddReceiptBookDto) {
    return this.receiptBookService.addBook(dto);
  }

  @Post('closeBook')
  @HttpCode(HttpStatus.OK)
  closeBook(@Body() dto: CloseBookDto) {
    return this.receiptBookService.closeBook(dto);
  }

  @Post('voidBook')
  @HttpCode(HttpStatus.OK)
  voidBook(@Body() dto: VoidBookDto) {
    return this.receiptBookService.voidBook(dto);
  }

  @Post('advanceCurrent')
  @HttpCode(HttpStatus.OK)
  advanceCurrent(@Body() dto: AdvanceCurrentDto) {
    return this.receiptBookService.advanceCurrent(dto);
  }
}
