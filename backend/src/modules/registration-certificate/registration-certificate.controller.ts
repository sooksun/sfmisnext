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
import { CurrentUser } from '../auth/current-user.decorator';
import {
  assertSameSchool,
  type JwtUser,
} from '../../common/utils/tenant-guard';

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
    @CurrentUser() user: JwtUser,
  ) {
    assertSameSchool(user, scId);
    return this.registrationCertificateService.loadRegistrationCertificate(
      scId,
      year,
    );
  }
}
