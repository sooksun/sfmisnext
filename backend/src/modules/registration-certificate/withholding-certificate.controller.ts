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
import { RegistrationCertificateService } from './registration-certificate.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

@UseGuards(RolesGuard)
@Roles(1, 2, 5, 8)
@Controller('Withholding_certificate')
export class WithholdingCertificateController {
  constructor(private readonly svc: RegistrationCertificateService) {}

  @Get('loadWithholdingCertificate/:sc_id/:sy_id')
  @HttpCode(HttpStatus.OK)
  loadList(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.svc.loadWithholdingCertificateList(scId, syId);
  }

  @Get('loadCheck/:sc_id/:sy_id')
  @HttpCode(HttpStatus.OK)
  loadCheck(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.svc.loadCheckForWC(scId, syId);
  }

  @Post('addWithholdingCertificate')
  @HttpCode(HttpStatus.OK)
  add(@Body() dto: any, @CurrentUser() user: JwtUser) {
    assertSameSchool(user, dto.sc_id);
    return this.svc.addWithholdingCertificate(dto);
  }

  @Post('updateWithholdingCertificate')
  @HttpCode(HttpStatus.OK)
  update(@Body() dto: any, @CurrentUser() user: JwtUser) {
    // ตรวจ tenant ถ้ามี sc_id ใน body; ถ้าไม่มีจะ verify ใน service ระดับ record
    if (dto.sc_id) assertSameSchool(user, dto.sc_id);
    return this.svc.updateWithholdingCertificate(dto);
  }
}
