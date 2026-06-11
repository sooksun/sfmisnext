import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CommitteeMemberDto {
  @IsString() role: string; // 'keeper' | 'auditor'
  @IsInt() seq: number;
  @IsString() name: string;
  @IsOptional() @IsString() position?: string;
  @IsOptional() @IsString() order_no?: string;
  @IsOptional() @IsString() order_date?: string;
}

export class SaveCommitteeDto {
  @IsInt() sc_id: number;
  @IsInt() up_by: number;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommitteeMemberDto)
  members: CommitteeMemberDto[];
}
