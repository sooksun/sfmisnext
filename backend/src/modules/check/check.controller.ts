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
import { CheckService } from './check.service';
import { UpdateCheckDto } from './dto/update-check.dto';

@Controller('Check')
export class CheckController {
  constructor(private readonly checkService: CheckService) {}

  @Get('loadCheck/:sc_id/:sy_id')
  @HttpCode(HttpStatus.OK)
  loadCheck(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
  ) {
    return this.checkService.loadCheck(scId, syId);
  }

  @Get('loadAutoNoCheck/:sc_id/:sy_id')
  @HttpCode(HttpStatus.OK)
  loadAutoNoCheck(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
  ) {
    return this.checkService.loadAutoNoCheck(scId, syId);
  }

  @Get('loadUser/:sc_id')
  @HttpCode(HttpStatus.OK)
  loadUser(@Param('sc_id', ParseIntPipe) scId: number) {
    return this.checkService.loadUser(scId);
  }

  @Get('loadPartner/:sc_id')
  @HttpCode(HttpStatus.OK)
  loadPartner(@Param('sc_id', ParseIntPipe) scId: number) {
    return this.checkService.loadPartner(scId);
  }

  @Get('loadBudget/:sc_id')
  @HttpCode(HttpStatus.OK)
  loadBudget(@Param('sc_id', ParseIntPipe) scId: number) {
    return this.checkService.loadBudget(scId);
  }

  @Get('loadCheckById/:sc_id/:sy_id/:rw_id')
  @HttpCode(HttpStatus.OK)
  loadCheckById(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('rw_id', ParseIntPipe) rwId: number,
  ) {
    return this.checkService.loadCheckById(scId, syId, rwId);
  }

  @Post('updateCheck')
  @HttpCode(HttpStatus.OK)
  updateCheck(@Body() dto: UpdateCheckDto) {
    return this.checkService.updateCheck(dto);
  }

  @Post('cancelCheck')
  @HttpCode(HttpStatus.OK)
  cancelCheck(@Body() body: { rw_id: number }) {
    return this.checkService.cancelCheck(body.rw_id);
  }
}
