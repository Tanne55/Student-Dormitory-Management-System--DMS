import { IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { AccountRole } from '../../entities/account.entity';

export class RegisterAccountDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsEnum(AccountRole)
  role?: AccountRole; // optional, defaults to 'STUDENT' in service
}
