import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateSetCommitteeDto {
  @IsInt()
  order_id: number;

  @IsNumber()
  committee1: number;

  @IsNumber()
  committee2: number;

  @IsNumber()
  committee3: number;

  @IsInt()
  order_status: number;

  @IsInt()
  p_id: number;

  @IsInt()
  day_deadline: number;

  @IsString()
  date_deadline: string;

  @IsOptional()
  @IsString()
  remark?: string;
}
