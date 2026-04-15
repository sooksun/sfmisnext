import { IsNotEmpty, IsNumber } from 'class-validator';

export class RemoveParcelOrderDto {
  @IsNotEmpty()
  @IsNumber()
  order_id: number;

  @IsNotEmpty()
  @IsNumber()
  del: number;
}
