import { Global, Module } from '@nestjs/common';
import { CrossDomainGuardService } from './cross-domain-guard.service';

/**
 * @Global() — guard ถูกเรียกข้ามหลายโมดูล (project-approve, invoice, supplie, ai)
 * ใช้ DataSource (global) + RegulatoryConfigService (global) จึงไม่ต้อง import entity ใด ๆ
 */
@Global()
@Module({
  providers: [CrossDomainGuardService],
  exports: [CrossDomainGuardService],
})
export class CrossDomainGuardModule {}
