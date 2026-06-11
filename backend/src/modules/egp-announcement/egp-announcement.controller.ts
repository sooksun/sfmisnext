import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EgpAnnouncementService } from './egp-announcement.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@UseGuards(RolesGuard)
@Roles(1, 2, 3, 4, 6, 7)
@Controller('EgpAnnouncement')
export class EgpAnnouncementController {
  constructor(private readonly svc: EgpAnnouncementService) {}

  @Get('load/:sc_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  load(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('budget_year', ParseIntPipe) budgetYear: number,
    @CurrentUser() user: JwtUser,
    @Query('type') type?: string,
  ) {
    assertSameSchool(user, scId);
    return this.svc.load(scId, budgetYear, type ? Number(type) : undefined);
  }

  @Post('add')
  @HttpCode(HttpStatus.OK)
  add(@Body() dto: any, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.svc.add(dto);
  }

  @Post('update')
  @HttpCode(HttpStatus.OK)
  update(@Body() dto: any, @CurrentUser() user: JwtUser) {
    return this.svc.update(dto, user);
  }

  @Post('publish')
  @HttpCode(HttpStatus.OK)
  publish(@Body() dto: any, @CurrentUser() user: JwtUser) {
    return this.svc.publish(dto, user);
  }

  @Post('close')
  @HttpCode(HttpStatus.OK)
  close(
    @Body() dto: { ea_id: number; up_by: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.close(dto.ea_id, dto.up_by, user);
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @Body() dto: { ea_id: number; reason: string; up_by: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.cancel(dto.ea_id, dto.reason, dto.up_by, user);
  }

  @Post('remove')
  @HttpCode(HttpStatus.OK)
  remove(
    @Body() dto: { ea_id: number; up_by: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.remove(dto.ea_id, dto.up_by, user);
  }
}
