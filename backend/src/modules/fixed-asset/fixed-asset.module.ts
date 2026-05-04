import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FixedAsset } from './entities/fixed-asset.entity';
import { FixedAssetDepreciation } from './entities/fixed-asset-depreciation.entity';
import { FixedAssetController } from './fixed-asset.controller';
import { FixedAssetService } from './fixed-asset.service';

@Module({
  imports: [TypeOrmModule.forFeature([FixedAsset, FixedAssetDepreciation])],
  controllers: [FixedAssetController],
  providers: [FixedAssetService],
  exports: [FixedAssetService],
})
export class FixedAssetModule {}
