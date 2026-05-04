import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  ValidateNested,
  IsIn,
  MaxLength,
  ArrayMaxSize,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

class ChatMessageDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @MaxLength(4000)
  content: string;
}

export class ChatRequestDto {
  @IsString()
  @MaxLength(2000)
  message: string;

  @IsNumber()
  sc_id: number;

  /** ปีงบประมาณ — รองรับทั้ง BE (2569) และ CE (2026) — 4 หลัก */
  @IsString()
  @Matches(/^\d{4}$/, { message: 'budget_year ต้องเป็นเลข 4 หลัก' })
  budget_year: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sc_name?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  history?: ChatMessageDto[];

  @IsOptional()
  @IsString()
  @MaxLength(50)
  context?: string; // เช่น "dashboard", "budget", "loan" — บอก AI ว่าอยู่หน้าไหน
}

export class ChatStreamRequestDto extends ChatRequestDto {}
