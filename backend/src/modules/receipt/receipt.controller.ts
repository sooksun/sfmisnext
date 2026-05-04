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
import { ReceiptService } from './receipt.service';
import { AddReceiptDto } from './dto/add-receipt.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@UseGuards(RolesGuard)
@Roles(1, 2, 5, 8)
@Controller('Receipt')
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) {}

  @Get('loadReceipt/:sc_id/:y_id/:year')
  @HttpCode(HttpStatus.OK)
  loadReceipt(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('y_id', ParseIntPipe) yId: number,
    @Param('year') year: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.receiptService.loadReceipt(scId, yId, year);
  }

  @Get('loadReceive/:sc_id/:sy_id/:year')
  @HttpCode(HttpStatus.OK)
  loadReceive(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('year') year: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.receiptService.loadReceive(scId, syId, year);
  }

  @Post('addReceipt')
  @HttpCode(HttpStatus.OK)
  addReceipt(@Body() dto: AddReceiptDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.receiptService.addReceipt(dto);
  }

  @Post('updateReceipt')
  @HttpCode(HttpStatus.OK)
  updateReceipt(@Body() dto: AddReceiptDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.receiptService.updateReceipt(dto);
  }

  @Post('removeReceipt')
  @HttpCode(HttpStatus.OK)
  removeReceipt(
    @Body() body: { r_id: number },
    @CurrentUser('sc_id') scId: number,
  ) {
    return this.receiptService.removeReceipt(body.r_id, scId);
  }
}
