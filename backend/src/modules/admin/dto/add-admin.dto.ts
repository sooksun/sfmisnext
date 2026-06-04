import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import {
  PASSWORD_MSG,
  PASSWORD_PATTERN,
} from '../../../common/constants/password';

export class AddAdminDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MSG })
  password?: string;

  @IsOptional()
  @IsString()
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

  @IsOptional()
  @IsInt()
  up_by?: number;
}
