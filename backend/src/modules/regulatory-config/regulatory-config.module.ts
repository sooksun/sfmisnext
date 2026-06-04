import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegulatoryConfigController } from './regulatory-config.controller';
import { RegulatoryConfigService } from './regulatory-config.service';
import { RegulatoryThreshold } from './entities/regulatory-threshold.entity';

/**
 * @Global() — service ถูกใช้ข้ามหลายโมดูล (check, supplie, project-approve ฯลฯ)
 * ทำให้ inject ได้โดยไม่ต้อง import ซ้ำในทุกโมดูล
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([RegulatoryThreshold])],
  controllers: [RegulatoryConfigController],
  providers: [RegulatoryConfigService],
  exports: [RegulatoryConfigService],
})
export class RegulatoryConfigModule {}
