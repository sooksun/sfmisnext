import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PASSWORD_MSG, PASSWORD_PATTERN } from '../../../common/constants/password';

export class UpdateAdminDto {
  @IsOptional()
  @IsInt()
  admin_id?: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MSG })
  password?: string;

  @IsOptional()
  @IsString()
  password_default?: string;

  @ValidateIf((o: UpdateAdminDto) => o.avata !== null && o.avata !== undefined)
  @IsOptional()
  @IsString()
  avata?: string | null;

  @ValidateIf(
    (o: UpdateAdminDto) => o.license !== null && o.license !== undefined,
  )
  @IsOptional()
  @IsString()
  license?: string | null;

  @IsOptional()
  @IsInt()
  type?: number;

  @IsOptional()
  @IsInt()
  position?: number;

  @IsOptional()
  @IsInt()
  sc_id?: number;

  @IsOptional()
  @IsInt()
  up_by?: number;

  @IsOptional()
  @IsInt()
  del?: number;

  @ValidateIf(
    (o: UpdateAdminDto) => o.profile !== null && o.profile !== undefined,
  )
  @IsOptional()
  @IsString()
  profile?: string | null;
}
