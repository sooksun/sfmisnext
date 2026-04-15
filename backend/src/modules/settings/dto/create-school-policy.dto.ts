import { IsInt, IsString } from 'class-validator';

export class CreateSchoolPolicyDto {
  @IsInt()
  sc_id: number;

  @IsString()
  sc_policy: string;

  @IsInt()
  up_by: number;
}
