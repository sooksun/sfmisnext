import { IsInt, IsString, MaxLength, MinLength } from 'class-validator';

export class AddExpenseTypeDto {
  @IsInt() sc_id: number;
  @IsString() @MinLength(1) @MaxLength(200) name: string;
  @IsInt() up_by: number;
}

export class DeleteExpenseTypeDto {
  @IsInt() bet_id: number;
  @IsInt() up_by: number;
}
