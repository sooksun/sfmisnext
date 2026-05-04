import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateFixedAssetDto {
  @IsInt()
  fa_id: number;

  @IsOptional() @IsInt() sc_id?: number;
  @IsOptional() @IsString() fa_name?: string;
  @IsOptional() @IsInt() fa_category?: number;
  @IsOptional() @IsString() fa_detail?: string;
  @IsOptional() @IsString() fa_brand?: string;
  @IsOptional() @IsString() fa_model?: string;
  @IsOptional() @IsString() fa_serial_no?: string;
  @IsOptional() @IsString() acquired_date?: string;
  @IsOptional() @IsNumber() @Min(0) acquired_price?: number;
  @IsOptional() @IsInt() @Min(1) useful_life_years?: number;
  @IsOptional() @IsInt() depreciation_method?: number;
  @IsOptional() @IsNumber() @Min(0) salvage_value?: number;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsInt() responsible_admin_id?: number;
  @IsOptional() @IsString() responsible_name?: string;
  @IsOptional() @IsInt() source?: number;
  @IsOptional() @IsString() image_url?: string;
  @IsOptional() @IsString() note?: string;

  @IsInt()
  up_by: number;
}
