import { IsString, Matches, MinLength } from 'class-validator';
import {
  PASSWORD_MSG,
  PASSWORD_PATTERN,
} from '../../../common/constants/password';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: 'กรุณาระบุรหัสผ่านเดิม' })
  old_password: string;

  @IsString()
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MSG })
  new_password: string;
}
