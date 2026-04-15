import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateUnitDto {
  @IsString()
  un_name: string;

  @IsInt()
  @IsOptional()
  sc_id?: number;

  @IsInt()
  @IsOptional()
  up_by?: number;
}
