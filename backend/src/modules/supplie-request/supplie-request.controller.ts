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
import { SupplieRequestService } from './supplie-request.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PageSizePipe } from '../../common/pipes/page-size.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@UseGuards(RolesGuard)
@Roles(1, 2, 4, 7)
@Controller('SupplieRequest')
export class SupplieRequestController {
  constructor(private readonly service: SupplieRequestService) {}

  @Get('load/:sc_id/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  load(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', PageSizePipe) pageSize: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.service.load(scId, page, pageSize);
  }

  @Get('detail/:req_id')
  @HttpCode(HttpStatus.OK)
  getDetail(
    @Param('req_id', ParseIntPipe) reqId: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.getDetail(reqId, user);
  }

  @Post('add')
  @HttpCode(HttpStatus.OK)
  add(@Body() body: any, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, body.sc_id);
    return this.service.add(body);
  }

  @Post('update')
  @HttpCode(HttpStatus.OK)
  update(@Body() body: any, @CurrentUser() user: JwtUser) {
    return this.service.update(body, user);
  }

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  submit(
    @Body() body: { req_id: number; up_by: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.submit(body.req_id, body.up_by, user);
  }

  @Post('approve')
  @HttpCode(HttpStatus.OK)
  approve(
    @Body() body: { req_id: number; up_by: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.approve(body.req_id, body.up_by, user);
  }

  @Post('reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @Body() body: { req_id: number; reason: string; up_by: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.reject(body.req_id, body.reason, body.up_by, user);
  }

  @Post('issue')
  @HttpCode(HttpStatus.OK)
  issue(
    @Body()
    body: {
      req_id: number;
      up_by: number;
      details: { rqd_id: number; issued_qty: number }[];
    },
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.issue(body.req_id, body.up_by, body.details, user);
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @Body() body: { req_id: number; up_by: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.cancel(body.req_id, body.up_by, user);
  }
}
