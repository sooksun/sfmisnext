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
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Controller('ReceiptBook')
export class ReceiptBookController {
  constructor(private readonly receiptBookService: ReceiptBookService) {}

  @Get('loadBooks/:sc_id/:sy_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  loadBooks(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('budget_year') budgetYear: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.receiptBookService.loadBooks(scId, syId, budgetYear);
  }

  @Get('activeBook/:sc_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  async getActiveBook(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('budget_year') budgetYear: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    // ห่อด้วย { data } เสมอ เพื่อให้ body เป็น JSON (เลี่ยง body ว่างเมื่อไม่มีเล่ม)
    const data = await this.receiptBookService.getActiveBook(scId, budgetYear);
    return { data };
  }

  @Post('addBook')
  @HttpCode(HttpStatus.OK)
  addBook(@Body() dto: AddReceiptBookDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.receiptBookService.addBook(dto);
  }

  @Post('closeBook')
  @HttpCode(HttpStatus.OK)
  closeBook(@Body() dto: CloseBookDto, @CurrentUser() user: JwtUser) {
    return this.receiptBookService.closeBook(dto, user);
  }

  @Post('voidBook')
  @HttpCode(HttpStatus.OK)
  voidBook(@Body() dto: VoidBookDto, @CurrentUser() user: JwtUser) {
    return this.receiptBookService.voidBook(dto, user);
  }

  @Post('advanceCurrent')
  @HttpCode(HttpStatus.OK)
  advanceCurrent(
    @Body() dto: AdvanceCurrentDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.receiptBookService.advanceCurrent(dto, user);
  }
}
