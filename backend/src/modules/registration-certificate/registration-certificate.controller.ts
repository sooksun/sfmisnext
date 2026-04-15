import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RegistrationCertificateService } from './registration-certificate.service';

@Controller('Registration_certificate')
export class RegistrationCertificateController {
  constructor(
    private readonly registrationCertificateService: RegistrationCertificateService,
  ) {}

  @Get('loadregistrationcertificate/:scId/:year')
  @HttpCode(HttpStatus.OK)
  loadRegistrationCertificate(
    @Param('scId', ParseIntPipe) scId: number,
    @Param('year') year: string,
  ) {
    return this.registrationCertificateService.loadRegistrationCertificate(
      scId,
      year,
    );
  }
}
