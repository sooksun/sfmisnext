import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class SaveCommitteeDto {
  @IsInt()
  @Min(1)
  rw_id: number;

  @IsInt()
  @Min(1)
  sc_id: number;

  @IsString()
  @IsNotEmpty()
  member1_name: string;

  @IsString()
  @IsNotEmpty()
  member1_position: string;

  @IsOptional()
  @IsString()
  member2_name?: string;

  @IsOptional()
  @IsString()
  member2_position?: string;

  @IsOptional()
  @IsString()
  member3_name?: string;

  @IsOptional()
  @IsString()
  member3_position?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  up_by?: number;
}
