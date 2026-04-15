import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RegistrationCertificateService } from './registration-certificate.service';

@Controller('Withholding_certificate')
export class WithholdingCertificateController {
  constructor(private readonly svc: RegistrationCertificateService) {}

  @Get('loadWithholdingCertificate/:sc_id/:sy_id')
  @HttpCode(HttpStatus.OK)
  loadList(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
  ) {
    return this.svc.loadWithholdingCertificateList(scId, syId);
  }

  @Get('loadCheck/:sc_id/:sy_id')
  @HttpCode(HttpStatus.OK)
  loadCheck(
    @Param('sc_id', ParseIntPipe) scId: number,
    @Param('sy_id', ParseIntPipe) syId: number,
  ) {
    return this.svc.loadCheckForWC(scId, syId);
  }

  @Post('addWithholdingCertificate')
  @HttpCode(HttpStatus.OK)
  add(@Body() dto: any) {
    return this.svc.addWithholdingCertificate(dto);
  }

  @Post('updateWithholdingCertificate')
  @HttpCode(HttpStatus.OK)
  update(@Body() dto: any) {
    return this.svc.updateWithholdingCertificate(dto);
  }
}
