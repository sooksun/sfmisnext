import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicePreAudit } from './entities/invoice-pre-audit.entity';
import { InvoicePreAuditController } from './invoice-pre-audit.controller';
import { InvoicePreAuditService } from './invoice-pre-audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([InvoicePreAudit])],
  controllers: [InvoicePreAuditController],
  providers: [InvoicePreAuditService],
  exports: [InvoicePreAuditService],
})
export class InvoicePreAuditModule {}
