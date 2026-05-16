import { IsString, MinLength } from 'class-validator';
import { IsStrongPassword } from '../password.validator';

export class RegisterAccountDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsString()
  @IsStrongPassword()
  password: string;
}
