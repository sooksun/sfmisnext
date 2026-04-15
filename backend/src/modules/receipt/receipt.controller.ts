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
import { ReceiptService } from './receipt.service';
import { AddReceiptDto } from './dto/add-receipt.dto';

@Controller('Receipt')
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) {}

  @Get('loadReceipt/:sc_id/:y_id/:year')
  @HttpCode(HttpStatus.OK)
  loadReceipt(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('y_id', ParseIntPipe) yId: number,
    @Param('year') year: string,
  ) {
    return this.receiptService.loadReceipt(scId, yId, year);
  }

  @Get('loadReceive/:sc_id/:sy_id/:year')
  @HttpCode(HttpStatus.OK)
  loadReceive(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('year') year: string,
  ) {
    return this.receiptService.loadReceive(scId, syId, year);
  }

  @Post('addReceipt')
  @HttpCode(HttpStatus.OK)
  addReceipt(@Body() dto: AddReceiptDto) {
    return this.receiptService.addReceipt(dto);
  }

  @Post('updateReceipt')
  @HttpCode(HttpStatus.OK)
  updateReceipt(@Body() dto: AddReceiptDto) {
    return this.receiptService.updateReceipt(dto);
  }

  @Post('removeReceipt')
  @HttpCode(HttpStatus.OK)
  removeReceipt(@Body() body: { r_id: number }) {
    return this.receiptService.removeReceipt(body.r_id);
  }
}
