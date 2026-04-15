import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';

export class AddInvoiceDto {
  @IsOptional()
  @IsNumber()
  rw_id?: number;

  @IsNotEmpty()
  @IsNumber()
  sc_id: number;

  @IsNotEmpty()
  @IsString()
  no_doc: string;

  @IsOptional()
  @IsNumber()
  payment_type?: number;

  @IsNotEmpty()
  @IsNumber()
  bg_type_id: number;

  @IsNotEmpty()
  @IsNumber()
  rw_type: number;

  @IsOptional()
  @IsNumber()
  order_id?: number;

  @IsNotEmpty()
  @IsNumber()
  p_id: number;

  @IsNotEmpty()
  @IsString()
  detail: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsNumber()
  certificate_payment?: number;

  @IsNotEmpty()
  @IsDateString()
  date_request: string;

  @IsOptional()
  @IsNumber()
  user_request_head?: number;

  @IsNotEmpty()
  @IsNumber()
  user_request: number;

  @IsOptional()
  @IsNumber()
  user_offer_check?: number;

  @IsOptional()
  @IsString()
  receipt_number?: string;

  @IsOptional()
  @IsString()
  receipt_picture?: string;

  @IsOptional()
  @IsDateString()
  offer_check_date?: string;

  @IsOptional()
  @IsString()
  check_no_doc?: string;

  @IsOptional()
  @IsNumber()
  type_offer_check?: number;

  @IsOptional()
  @IsNumber()
  status?: number;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsNotEmpty()
  @IsNumber()
  sy_id: number;

  @IsNotEmpty()
  @IsString()
  year: string;

  @IsOptional()
  @IsNumber()
  up_by?: number;

  @IsOptional()
  @IsNumber()
  del?: number;
}
