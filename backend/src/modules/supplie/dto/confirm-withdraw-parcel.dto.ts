import { IsNotEmpty, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class TransactionDetail {
  @IsNotEmpty()
  @IsNumber()
  supp_id: number;

  @IsNotEmpty()
  @IsNumber()
  trans_in: number;

  @IsNotEmpty()
  @IsNumber()
  trans_out: number;
}

export class ConfirmWithdrawParcelDto {
  @IsNotEmpty()
  order: {
    receive_id: number;
    receive_status: number;
  };

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransactionDetail)
  detail: TransactionDetail[];
}
