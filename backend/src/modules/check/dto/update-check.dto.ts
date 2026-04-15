import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class UpdateCheckDto {
  @IsNotEmpty()
  @IsNumber()
  rw_id: number;

  @IsNotEmpty()
  @IsNumber()
  check_no_doc: number;

  @IsOptional()
  @IsNumber()
  type_offer_check?: number;

  @IsNotEmpty()
  @IsNumber()
  user_offer_check: number;

  @IsNotEmpty()
  @IsDateString()
  offer_check_date: string;

  @IsNotEmpty()
  @IsNumber()
  status: number;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsNumber()
  del?: number;

  @IsOptional()
  transaction?: {
    real_amount: number;
    bg_type_id: number;
    up_by: number;
    sc_id: number;
  };
}
