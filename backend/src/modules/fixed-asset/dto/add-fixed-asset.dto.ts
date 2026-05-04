import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class AddFixedAssetDto {
  @IsInt()
  sc_id: number;

  @IsString()
  @IsNotEmpty()
  fa_name: string;

  @IsInt()
  fa_category: number;

  @IsOptional() @IsString() fa_code?: string;
  @IsOptional() @IsString() fa_detail?: string;
  @IsOptional() @IsString() fa_brand?: string;
  @IsOptional() @IsString() fa_model?: string;
  @IsOptional() @IsString() fa_serial_no?: string;

  @IsOptional() @IsString() acquired_date?: string;

  @IsNumber()
  @Min(0)
  acquired_price: number;

  @IsOptional() @IsInt() @Min(1) useful_life_years?: number;
  @IsOptional() @IsInt() depreciation_method?: number;
  @IsOptional() @IsNumber() @Min(0) salvage_value?: number;

  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsInt() responsible_admin_id?: number;
  @IsOptional() @IsString() responsible_name?: string;
  @IsOptional() @IsInt() source?: number;
  @IsOptional() @IsInt() parcel_order_id?: number;
  @IsOptional() @IsInt() receive_parcel_order_id?: number;
  @IsOptional() @IsString() image_url?: string;
  @IsOptional() @IsString() note?: string;

  @IsInt()
  up_by: number;
}
