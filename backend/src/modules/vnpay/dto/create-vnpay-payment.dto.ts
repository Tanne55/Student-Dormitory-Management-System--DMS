import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class CreateVnpayPaymentDto {
  @ApiProperty({ description: 'ID hoa don can thanh toan' })
  @IsString()
  @IsNotEmpty()
  invoiceId: string;

  @ApiPropertyOptional({ description: 'Ma sinh vien thanh toan (neu khac voi tk dang nhap)' })
  @IsString()
  @IsOptional()
  payerStudentCode?: string;

  @ApiPropertyOptional({ description: 'Ma ngan hang VNPay (VD: NCB, VNBANK...). De trong de chon tren VNPay.' })
  @IsString()
  @IsOptional()
  bankCode?: string;
}
