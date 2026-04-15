import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class ApproveParcelByBusinessDto {
  @IsNotEmpty()
  @IsNumber()
  order_id: number;

  @IsNotEmpty()
  @IsNumber()
  order_status: number;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsString()
  remark_cf?: string;
}
