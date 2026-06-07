import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TravelerDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() position?: string;
  @IsOptional() @IsNumber() allowance?: number;
  @IsOptional() @IsNumber() lodging?: number;
  @IsOptional() @IsNumber() transport?: number;
  @IsOptional() @IsNumber() other?: number;
  @IsOptional() @IsString() note?: string;
}

export class AddTravelReimbursementDto {
  @IsNumber() sc_id: number;
  @IsNumber() sy_id: number;
  @IsString() budget_year: string;

  @IsNumber() requester_id: number;
  @IsOptional() @IsString() requester_position?: string;
  @IsOptional() @IsString() affiliation?: string;
  @IsOptional() @IsString() province?: string;
  @IsOptional() @IsString() at_office?: string;

  @IsOptional() @IsString() order_ref?: string;
  @IsOptional() @IsString() order_date?: string;

  @IsOptional() @IsString() purpose?: string;
  @IsOptional() @IsString() companions?: string;
  @IsOptional() @IsNumber() depart_from?: number;
  @IsOptional() @IsString() depart_date?: string;
  @IsOptional() @IsString() depart_time?: string;
  @IsOptional() @IsString() return_date?: string;
  @IsOptional() @IsString() return_time?: string;
  @IsOptional() @IsNumber() total_days?: number;
  @IsOptional() @IsNumber() total_hours?: number;

  @IsNumber() money_type_id: number;
  @IsOptional() @IsNumber() la_id?: number;

  @IsOptional() @IsNumber() @Min(0) evidence_count?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TravelerDto)
  travelers: TravelerDto[];

  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsNumber() up_by?: number;
}
