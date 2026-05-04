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

@Controller('FixedAsset')
export class FixedAssetController {
  constructor(private readonly svc: FixedAssetService) {}

  @Get('load/:sc_id/:page/:pageSize')
  @HttpCode(HttpStatus.OK)
  load(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('page', ParseIntPipe) page: number,
    @Param('pageSize', new PageSizePipe()) pageSize: number,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('q') q?: string,
  ) {
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
  get(@Param('fa_id', ParseIntPipe) faId: number) {
    return this.svc.get(faId);
  }

  @Post('add')
  @HttpCode(HttpStatus.OK)
  add(@Body() dto: AddFixedAssetDto) {
    return this.svc.add(dto);
  }

  @Post('update')
  @HttpCode(HttpStatus.OK)
  update(@Body() dto: UpdateFixedAssetDto) {
    return this.svc.update(dto);
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
  ) {
    return this.svc.changeStatus(
      dto.fa_id,
      dto.status,
      dto.note ?? '',
      dto.up_by,
    );
  }

  @Post('remove')
  @HttpCode(HttpStatus.OK)
  remove(@Body() dto: { fa_id: number; up_by: number }) {
    return this.svc.remove(dto.fa_id, dto.up_by);
  }

  @Post('calcDepreciation')
  @HttpCode(HttpStatus.OK)
  calcDepreciation(
    @Body() dto: { sc_id: number; budget_year: number; up_by: number },
  ) {
    return this.svc.calcDepreciation(dto.sc_id, dto.budget_year, dto.up_by);
  }

  @Get('report/:sc_id/:budget_year')
  @HttpCode(HttpStatus.OK)
  report(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('budget_year', ParseIntPipe) budgetYear: number,
  ) {
    return this.svc.report(scId, budgetYear);
  }
}
