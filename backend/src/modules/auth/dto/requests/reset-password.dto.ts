import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../password.validator';

export class ResetPasswordDto {
    @ApiProperty({ description: 'Mã xác nhận để đổi mật khẩu' })
    @IsString()
    @IsNotEmpty()
    token: string;

    @ApiProperty({ description: 'Mật khẩu mới' })
    @IsString()
    @IsStrongPassword()
    newPassword: string;
}
