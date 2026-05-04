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
import { CheckService } from './check.service';
import { UpdateCheckDto } from './dto/update-check.dto';
import { SaveCommitteeDto } from './dto/save-committee.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@UseGuards(RolesGuard)
@Roles(1, 2, 5, 8)
@Controller('Check')
export class CheckController {
  constructor(private readonly checkService: CheckService) {}

  @Get('loadCheck/:sc_id/:sy_id')
  @HttpCode(HttpStatus.OK)
  loadCheck(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.checkService.loadCheck(scId, syId);
  }

  @Get('loadAutoNoCheck/:sc_id/:sy_id')
  @HttpCode(HttpStatus.OK)
  loadAutoNoCheck(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.checkService.loadAutoNoCheck(scId, syId);
  }

  @Get('loadUser/:sc_id')
  @HttpCode(HttpStatus.OK)
  loadUser(
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.checkService.loadUser(scId);
  }

  @Get('loadPartner/:sc_id')
  @HttpCode(HttpStatus.OK)
  loadPartner(
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.checkService.loadPartner(scId);
  }

  @Get('loadBudget/:sc_id')
  @HttpCode(HttpStatus.OK)
  loadBudget(
    @Param('sc_id', ParseIntPipe) scId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.checkService.loadBudget(scId);
  }

  @Get('loadCheckById/:sc_id/:sy_id/:rw_id')
  @HttpCode(HttpStatus.OK)
  loadCheckById(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @Param('rw_id', ParseIntPipe) rwId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.checkService.loadCheckById(scId, syId, rwId);
  }

  @Post('updateCheck')
  @HttpCode(HttpStatus.OK)
  updateCheck(@Body() dto: UpdateCheckDto, @CurrentUser('sc_id') scId: number) {
    return this.checkService.updateCheck(dto, scId);
  }

  @Post('cancelCheck')
  @HttpCode(HttpStatus.OK)
  cancelCheck(
    @Body() body: { rw_id: number },
    @CurrentUser('sc_id') scId: number,
  ) {
    return this.checkService.cancelCheck(body.rw_id, scId);
  }

  @Get('loadCommittee/:rw_id')
  @HttpCode(HttpStatus.OK)
  loadCommittee(
    @Param('rw_id', ParseIntPipe) rwId: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.checkService.loadCommittee(rwId, user.sc_id, user.type);
  }

  @Post('saveCommittee')
  @HttpCode(HttpStatus.OK)
  saveCommittee(@Body() dto: SaveCommitteeDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.checkService.saveCommittee(dto);
  }
}
