import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SaveItemDto {
  @IsString() item_code: string;
  @IsIn(['yes', 'no', 'na']) answer: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsInt() attachment_id?: number;
}

export class SaveAssessmentDto {
  @IsNumber() sc_id: number;
  @IsNumber() sy_id: number;
  @IsString() budget_year: string;
  @IsOptional() @IsString() as_of_date?: string;
  @IsOptional() @IsInt() student_count?: number;
  @IsOptional() @IsString() note?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveItemDto)
  items?: SaveItemDto[];
  @IsOptional() @IsNumber() up_by?: number;
}

export class ConfirmAssessmentDto {
  @IsNumber() fa_id: number;
  @IsOptional() @IsNumber() up_by?: number;
}

export class SaveAttestationDto {
  @IsNumber() sc_id: number;
  @IsNumber() sy_id: number;
  @IsString() budget_year: string;
  @IsOptional() @IsString() plan_committee_date?: string | null;
  @IsOptional() @IsString() plan_committee_doc_no?: string | null;
  @IsOptional() @IsNumber() up_by?: number;
}
