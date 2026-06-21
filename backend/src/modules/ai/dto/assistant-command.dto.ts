import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class AssistantCommandDto {
  @IsString()
  @MaxLength(3000)
  message: string;

  @IsNumber()
  sc_id: number;

  @IsString()
  @Matches(/^\d{4}$/)
  budget_year: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  current_path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  task_key?: string;

  @IsOptional()
  @IsObject()
  draft?: Record<string, unknown>;
}
