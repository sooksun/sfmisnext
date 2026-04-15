import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReceiveParcelCartItem {
  @IsOptional()
  @IsNumber()
  rp_id?: number;

  @IsNotEmpty()
  @IsNumber()
  supp_id: number;

  @IsNotEmpty()
  @IsNumber()
  receive: number;

  @IsOptional()
  @IsNumber()
  balance_project?: number;

  @IsOptional()
  @IsNumber()
  balance_stock?: number;
}

export class EditReceiveParcelDto {
  @IsOptional()
  @IsNumber()
  receive_id?: number;

  @IsNotEmpty()
  @IsNumber()
  order_id: number;

  @IsNotEmpty()
  @IsNumber()
  admin_id: number;

  @IsOptional()
  @IsNumber()
  agent?: number;

  @IsNotEmpty()
  @IsNumber()
  sc_id: number;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsNumber()
  sy_year: number;

  @IsNotEmpty()
  @IsDateString()
  receive_date: string;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveParcelCartItem)
  cart: ReceiveParcelCartItem[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveParcelCartItem)
  cart_receive_del?: ReceiveParcelCartItem[];
}
