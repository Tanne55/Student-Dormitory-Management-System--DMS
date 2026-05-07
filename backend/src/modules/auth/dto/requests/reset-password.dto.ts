import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
    @ApiProperty({ description: 'Mã xác nhận để đổi mật khẩu' })
    @IsString()
    @IsNotEmpty()
    token: string;

    @ApiProperty({ description: 'Mật khẩu mới' })
    @IsString()
    @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
    newPassword: string;
}
