import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { SettingsService } from './settings.service';

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
  addSchoolPolicy(@Body() payload: any) {
    return this.settingsService.addSchoolPolicy({
      sc_id: payload.sc_id,
      sc_policy: payload.sp_name ?? payload.sc_policy ?? '',
      up_by: payload.up_by ?? 0,
    });
  }

  @Post('update_school_policy')
  @HttpCode(HttpStatus.OK)
  updateSchoolPolicy(@Body() payload: any) {
    return this.settingsService.updateSchoolPolicy({
      scp_id: payload.sp_id ?? payload.scp_id,
      sc_id: payload.sc_id,
      sc_policy: payload.sp_name ?? payload.sc_policy,
      up_by: payload.up_by,
    });
  }

  @Post('remove_school_policy')
  @HttpCode(HttpStatus.OK)
  removeSchoolPolicy(@Body() payload: any) {
    return this.settingsService.removeSchoolPolicy({
      scp_id: payload.sp_id ?? payload.scp_id,
    });
  }
}
