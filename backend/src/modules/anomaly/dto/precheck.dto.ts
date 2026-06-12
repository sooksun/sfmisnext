import { IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class PrecheckDto {
  @IsNumber() sc_id: number;
  @IsOptional() @IsString() budget_year?: string;
  @IsOptional() @IsString() module?: string;
  @IsObject() payload: Record<string, unknown>;
}
