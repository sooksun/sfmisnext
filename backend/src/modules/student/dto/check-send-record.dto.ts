import { IsInt } from 'class-validator';

export class CheckSendRecordDto {
  @IsInt()
  sc_id: number;

  @IsInt()
  sy_id: number;

  @IsInt()
  year: number;
}
