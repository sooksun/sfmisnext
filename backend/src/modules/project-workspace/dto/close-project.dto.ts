import { IsOptional, IsString } from 'class-validator';

export class CloseProjectDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
