import { IsString, IsNotEmpty, Matches, IsEmail } from 'class-validator';

export class CreateStaffDto {
    @IsString()
    @IsNotEmpty({ message: 'Tên đăng nhập không được để trống.' })
    username: string;

    @IsString()
    @IsNotEmpty({ message: 'Họ và tên không được để trống.' })
    @Matches(/^[a-zA-ZÀ-ỹ\s]+$/, { message: 'Họ tên không được chứa số hoặc ký tự đặc biệt.' })
    fullName: string;

    @IsString()
    @IsNotEmpty({ message: 'Số điện thoại không được để trống.' })
    @Matches(/^0[0-9]{9}$/, { message: 'Số điện thoại phải đủ 10 chữ số và bắt đầu từ 0.' })
    phone: string;

    @IsEmail({}, { message: 'Định dạng Email không hợp lệ.' })
    @IsNotEmpty({ message: 'Email không được để trống.' })
    email: string;

    @IsString()
    @IsNotEmpty({ message: 'CCCD không được để trống.' })
    @Matches(/^[0-9]{12}$/, { message: 'CCCD phải nhập đúng 12 chữ số.' })
    idCardNumber: string;
}
