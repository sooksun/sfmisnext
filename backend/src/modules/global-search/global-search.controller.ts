import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GlobalSearchService } from './global-search.service';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Controller('GlobalSearch')
export class GlobalSearchController {
  constructor(private readonly globalSearchService: GlobalSearchService) {}

  /**
   * GET GlobalSearch/search/:sc_id?q=บค.12%2F2568
   * Searches across document numbers: no_doc, check_no_doc, pr_no.
   * Returns unified results (max 20).
   *
   * Multi-tenant guard: scId ต้องตรงกับ JWT user.sc_id (super admin ข้ามได้)
   */
  @Get('search/:sc_id')
  @HttpCode(HttpStatus.OK)
  search(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Query('q') q: string,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.globalSearchService.search(scId, q ?? '');
  }
}
