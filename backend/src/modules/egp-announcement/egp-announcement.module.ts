import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EgpAnnouncement } from './entities/egp-announcement.entity';
import { EgpAnnouncementController } from './egp-announcement.controller';
import { EgpAnnouncementService } from './egp-announcement.service';

@Module({
  imports: [TypeOrmModule.forFeature([EgpAnnouncement])],
  controllers: [EgpAnnouncementController],
  providers: [EgpAnnouncementService],
  exports: [EgpAnnouncementService],
})
export class EgpAnnouncementModule {}
