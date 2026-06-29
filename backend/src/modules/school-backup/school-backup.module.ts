import { Module } from '@nestjs/common';
import { SchoolBackupController } from './school-backup.controller';
import { SchoolBackupService } from './school-backup.service';

@Module({
  controllers: [SchoolBackupController],
  providers: [SchoolBackupService],
})
export class SchoolBackupModule {}
