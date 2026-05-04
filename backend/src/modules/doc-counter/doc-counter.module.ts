import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocCounterController } from './doc-counter.controller';
import { DocCounterService } from './doc-counter.service';
import { DocumentCounter } from './entities/document-counter.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentCounter])],
  controllers: [DocCounterController],
  providers: [DocCounterService],
  exports: [DocCounterService],
})
export class DocCounterModule {}
