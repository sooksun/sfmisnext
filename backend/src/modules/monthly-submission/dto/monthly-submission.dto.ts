import { IsNumber, IsString, IsOptional } from 'class-validator';

export class SaveSubmissionDto {
  @IsNumber() sc_id: number;
  @IsNumber() sy_id: number;
  @IsString() submit_month: string;
  @IsString() checklist: string; // JSON string
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsNumber() up_by?: number;
}

export class SubmitDto {
  @IsNumber() ms_id: number;
  @IsOptional() @IsNumber() up_by?: number;
}

export class ConfirmDto {
  @IsNumber() ms_id: number;
  @IsOptional() @IsNumber() up_by?: number;
}
