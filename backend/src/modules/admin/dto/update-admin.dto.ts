import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class UpdateAdminDto {
  @IsInt()
  @IsOptional()
  admin_id?: number;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  password_default?: string;

  @ValidateIf((o: UpdateAdminDto) => o.avata !== null && o.avata !== undefined)
  @IsString()
  @IsOptional()
  avata?: string | null;

  @ValidateIf(
    (o: UpdateAdminDto) => o.license !== null && o.license !== undefined,
  )
  @IsString()
  @IsOptional()
  license?: string | null;

  @IsInt()
  @IsOptional()
  type?: number;

  @IsInt()
  @IsOptional()
  position?: number;

  @IsInt()
  @IsOptional()
  sc_id?: number;

  @IsInt()
  @IsOptional()
  up_by?: number;

  @IsInt()
  @IsOptional()
  del?: number;

  @ValidateIf(
    (o: UpdateAdminDto) => o.profile !== null && o.profile !== undefined,
  )
  @IsString()
  @IsOptional()
  profile?: string | null;
}
