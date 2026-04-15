import { IsInt, IsOptional } from 'class-validator';

export class ConfirmSendRecordDto {
  @IsOptional()
  @IsInt()
  ssr_id?: number;

  @IsInt()
  sc_id: number;

  @IsInt()
  sy_id: number;

  @IsInt()
  year: number;

  @IsOptional()
  @IsInt()
  up_by?: number;
}
