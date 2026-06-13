import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** รับข้อความรวม (พิมพ์/เสียง) แล้วให้ AI สกัดเป็นฟิลด์โครงการ */
export class ParseProjectDto {
  @IsString()
  @MaxLength(8000)
  text: string;

  @IsInt()
  sc_id: number;

  @IsOptional()
  @IsInt()
  sy_id?: number;

  @IsOptional()
  @IsInt()
  budget_year?: number;

  /** ช่วงปีงบ (CE YYYY-MM-DD) ใช้ช่วยตีความวันที่/ปี */
  @IsOptional()
  @IsString()
  fiscal_start?: string;

  @IsOptional()
  @IsString()
  fiscal_end?: string;

  /** ตัวเลือกนโยบายโรงเรียน ให้ AI จับคู่ */
  @IsOptional()
  @IsArray()
  policies?: { scp_id: number; name: string }[];

  /** ตัวเลือกประเภทงบประมาณ ให้ AI จับคู่ */
  @IsOptional()
  @IsArray()
  budget_types?: string[];
}
