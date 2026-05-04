import { IsNumber, IsString, Min } from 'class-validator';

export class GetNextNumberDto {
  @IsNumber()
  sc_id: number;

  @IsString()
  budget_year: string;

  @IsString()
  doc_type: string;
}

export class ResetCounterDto {
  @IsNumber()
  sc_id: number;

  @IsString()
  budget_year: string;

  @IsString()
  doc_type: string;

  @IsNumber()
  @Min(0)
  reset_to: number;
}
