import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class AddIntraBankTransferDto {
  @IsInt()
  @Min(1)
  sc_id: number;

  @IsString()
  @IsNotEmpty()
  transfer_date: string;

  @IsInt()
  @Min(1)
  from_bank_id: number;

  @IsInt()
  @Min(1)
  to_bank_id: number;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fee?: number;

  @IsOptional()
  @IsInt()
  transfer_method?: number;

  @IsOptional()
  @IsString()
  ref_no?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsInt()
  @Min(1)
  up_by: number;
}

export class CompleteIntraBankTransferDto {
  @IsInt()
  @Min(1)
  ibt_id: number;

  @IsString()
  @IsNotEmpty()
  completed_date: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  from_ledger_id?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  to_ledger_id?: number;

  @IsInt()
  @Min(1)
  up_by: number;
}

export class CancelIntraBankTransferDto {
  @IsInt()
  @Min(1)
  ibt_id: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsInt()
  @Min(1)
  up_by: number;
}
