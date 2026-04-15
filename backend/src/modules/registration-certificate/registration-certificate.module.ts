import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistrationCertificateController } from './registration-certificate.controller';
import { WithholdingCertificateController } from './withholding-certificate.controller';
import { RegistrationCertificateService } from './registration-certificate.service';
import { WithholdingCertificate } from './entities/withholding-certificate.entity';
import { RequestWithdraw } from '../invoice/entities/request-withdraw.entity';
import { Partner } from '../general-db/entities/partner.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WithholdingCertificate,
      RequestWithdraw,
      Partner,
    ]),
  ],
  controllers: [RegistrationCertificateController, WithholdingCertificateController],
  providers: [RegistrationCertificateService],
  exports: [RegistrationCertificateService],
})
export class RegistrationCertificateModule {}
