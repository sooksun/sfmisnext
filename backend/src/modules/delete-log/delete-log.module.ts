import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeleteLog } from './entities/delete-log.entity';
import { DeleteLogService } from './delete-log.service';
import { DeleteLogController } from './delete-log.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([DeleteLog])],
  controllers: [DeleteLogController],
  providers: [DeleteLogService],
  exports: [DeleteLogService],
})
export class DeleteLogModule {}
