import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';

export class UpdateSupplieOrderDto {
  @IsNotEmpty()
  @IsNumber()
  order_id: number;

  @IsOptional()
  @IsNumber()
  order_status?: number;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  item?: any;
}
