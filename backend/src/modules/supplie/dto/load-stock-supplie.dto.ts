import { IsNotEmpty, IsNumber, IsOptional, IsArray } from 'class-validator';

export class ParcelOrderItem {
  @IsNotEmpty()
  @IsNumber()
  supp_id: number;

  @IsNotEmpty()
  @IsNumber()
  pc_total: number;
}

export class LoadStockSupplieDto {
  @IsNotEmpty()
  @IsArray()
  pc_order: ParcelOrderItem[];

  @IsNotEmpty()
  @IsNumber()
  sc_id: number;

  @IsOptional()
  @IsNumber()
  receive_id?: number;
}
