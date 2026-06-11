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
} from '@nestjs/common';
import { FixedAssetService } from './fixed-asset.service';
import { AddFixedAssetDto } from './dto/add-fixed-asset.dto';
import { UpdateFixedAssetDto } from './dto/update-fixed-asset.dto';
import { PageSizePipe } from '../../common/pipes/page-size.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@Controller('FixedAsset')
export class FixedAssetController {
  constructor(private readonly svc: FixedAssetService) {}

  @Get('load/:sc_id/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  load(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', new PageSizePipe()) pageSize: number,
    @CurrentUser() user: JwtUser,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('q') q?: string,
  ) {
    assertSameSchool(user, scId);
    return this.svc.load(
      scId,
      page,
      pageSize,
      status ? Number(status) : undefined,
      category ? Number(category) : undefined,
      q,
    );
  }

  @Get('get/:fa_id')
  @HttpCode(HttpStatus.OK)
  get(
    @Param('fa_id', ParseIntPipe) faId: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.get(faId, user);
  }

  @Post('add')
  @HttpCode(HttpStatus.OK)
  add(@Body() dto: AddFixedAssetDto, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.svc.add(dto);
  }

  @Post('update')
  @HttpCode(HttpStatus.OK)
  update(@Body() dto: UpdateFixedAssetDto, @CurrentUser() user: JwtUser) {
    if (dto.sc_id != null) assertSameSchool(user, dto.sc_id);
    return this.svc.update(dto, user);
  }

  @Post('changeStatus')
  @HttpCode(HttpStatus.OK)
  changeStatus(
    @Body()
    dto: {
      fa_id: number;
      status: number;
      note?: string;
      up_by: number;
    },
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.changeStatus(
      dto.fa_id,
      dto.status,
      dto.note ?? '',
      dto.up_by,
      user,
    );
  }

  @Post('remove')
  @HttpCode(HttpStatus.OK)
  remove(
    @Body() dto: { fa_id: number; up_by: number },
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.remove(dto.fa_id, dto.up_by, user);
  }

  @Post('calcDepreciation')
  @HttpCode(HttpStatus.OK)
  calcDepreciation(
    @Body() dto: { sc_id: number; budget_year: number; up_by: number },
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, dto.sc_id);
    return this.svc.calcDepreciation(dto.sc_id, dto.budget_year, dto.up_by);
  }

  @Get('report/:sc_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  report(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('budget_year', ParseIntPipe) budgetYear: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.svc.report(scId, budgetYear);
  }
}
