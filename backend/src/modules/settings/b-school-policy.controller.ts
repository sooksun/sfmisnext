import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@UseGuards(RolesGuard)
@Controller('B_school_policy')
export class BSchoolPolicyController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('load_school_policy/:scId/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  async loadSchoolPolicyGet(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    const result = await this.settingsService.loadSchoolPolicy(
      scId,
      page,
      pageSize,
    );
    return {
      ...result,
      data: result.data.map((item: any) => ({
        sp_id: item.scp_id,
        sp_name: item.sc_policy,
        sp_detail: item.sc_policy,
        sc_id: item.sc_id,
        del: item.del,
        up_by: item.up_by,
        up_date: item.update_date,
      })),
    };
  }

  @Post('load_school_policy/:scId/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  async loadSchoolPolicy(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', ParseIntPipe) pageSize: number,
  ) {
    const result = await this.settingsService.loadSchoolPolicy(
      scId,
      page,
      pageSize,
    );
    return {
      ...result,
      data: result.data.map((item: any) => ({
        sp_id: item.scp_id,
        sp_name: item.sc_policy,
        sp_detail: item.sc_policy,
        sc_id: item.sc_id,
        del: item.del,
        up_by: item.up_by,
        up_date: item.update_date,
      })),
    };
  }

  @Post('add_school_policy')
  @HttpCode(HttpStatus.OK)
  @Roles(1, 2)
  addSchoolPolicy(@Body() payload: any, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, Number(payload.sc_id));
    return this.settingsService.addSchoolPolicy({
      sc_id: payload.sc_id,
      sc_policy: payload.sp_name ?? payload.sc_policy ?? '',
      up_by: payload.up_by ?? 0,
    });
  }

  @Post('update_school_policy')
  @HttpCode(HttpStatus.OK)
  @Roles(1, 2)
  updateSchoolPolicy(@Body() payload: any, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, Number(payload.sc_id));
    return this.settingsService.updateSchoolPolicy({
      scp_id: payload.sp_id ?? payload.scp_id,
      sc_id: payload.sc_id,
      sc_policy: payload.sp_name ?? payload.sc_policy,
      up_by: payload.up_by,
    });
  }

  @Post('remove_school_policy')
  @HttpCode(HttpStatus.OK)
  @Roles(1, 2)
  removeSchoolPolicy(@Body() payload: any, @CurrentUser() user: JwtUser) {
    if (payload.sc_id !== undefined)
      assertSameSchool(user, Number(payload.sc_id));
    return this.settingsService.removeSchoolPolicy({
      scp_id: payload.sp_id ?? payload.scp_id,
    });
  }
}
