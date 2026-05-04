import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DeleteLogService } from './delete-log.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  isSameSchoolOrSuper,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Controller('Delete_log')
@UseGuards(RolesGuard)
@Roles(1, 2)
export class DeleteLogController {
  constructor(private readonly svc: DeleteLogService) {}

  /**
   * Multi-tenant guard:
   *  - super admin (type=1): เห็นได้ทุก scId (รวม ไม่ส่ง scId = ทุกโรงเรียน)
   *  - admin (type=2): บังคับ scId = JWT.sc_id (ส่งอื่น = 403)
   */
  @Get('list/:table')
  list(
    @Param('table') table: string,
    @CurrentUser() user: JwtUser,
    @Query('scId') scIdRaw?: string,
  ) {
    const requestedScId = scIdRaw ? Number(scIdRaw) : undefined;

    // Super admin: ส่ง scId ก็ได้ ไม่ส่งก็ได้
    if (user.type === 1) {
      return this.svc.listByTable(table, requestedScId);
    }

    // Non-super: บังคับ scope ที่ JWT.sc_id เสมอ — ignore scId ที่ส่งมา (หรือ throw ถ้าต่าง)
    if (requestedScId !== undefined && requestedScId !== user.sc_id) {
      assertSameSchool(user, requestedScId); // throw 403
    }
    return this.svc.listByTable(table, user.sc_id);
  }

  @Get('listBySchool/:scId/:table')
  listBySchool(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('table') table: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.svc.listByTable(table, scId);
  }
}
