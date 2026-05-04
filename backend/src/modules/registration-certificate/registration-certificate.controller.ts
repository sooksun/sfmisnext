import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { RegistrationCertificateService } from './registration-certificate.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(RolesGuard)
@Roles(1, 2, 5, 8)
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
