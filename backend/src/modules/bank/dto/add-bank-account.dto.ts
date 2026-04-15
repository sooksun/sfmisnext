import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class AddBankAccountDto {
  @IsOptional()
  @IsNumber()
  ba_id?: number;

  @IsNotEmpty()
  @IsNumber()
  b_id: number;

  @IsNotEmpty()
  @IsString()
  ba_name: string;

  @IsNotEmpty()
  @IsString()
  ba_no: string;

  @IsNotEmpty()
  @IsNumber()
  sc_id: number;

  @IsOptional()
  @IsNumber()
  up_by?: number;
}
