import { IsEmail, IsInt, IsOptional, IsString } from 'class-validator';

export class AddAdminDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  password_default?: string;

  @IsOptional()
  profile?: any; // Can be object { group, type, data, valid } or string

  @IsOptional()
  license?: any; // Can be object { group, type, data, valid } or string

  @IsInt()
  type: number;

  @IsInt()
  position: number;

  @IsInt()
  sc_id: number;

  @IsInt()
  @IsOptional()
  up_by?: number;
}
