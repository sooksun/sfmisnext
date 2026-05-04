import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SarReport } from './entities/sar-report.entity';
import { SarReportController } from './sar-report.controller';
import { SarReportService } from './sar-report.service';

@Module({
  imports: [TypeOrmModule.forFeature([SarReport])],
  controllers: [SarReportController],
  providers: [SarReportService],
  exports: [SarReportService],
})
export class SarReportModule {}
