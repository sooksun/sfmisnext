import { IsNotEmpty, IsNumber } from 'class-validator';

export class LoadParcelDetailDto {
  @IsNotEmpty()
  @IsNumber()
  sc_id: number;

  @IsNotEmpty()
  @IsNumber()
  order_id: number;
}
