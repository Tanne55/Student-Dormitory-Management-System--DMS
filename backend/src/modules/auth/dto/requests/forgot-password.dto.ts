import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
    @ApiProperty({ description: 'Tên đăng nhập của người dùng' })
    @IsString()
    @IsNotEmpty()
    username: string;
}
