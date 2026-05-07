import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';

export class CreatePaymentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  invoiceId: string;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.CASH })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payerStudentCode?: string;

  @ApiPropertyOptional({ description: 'Optional override, defaults to full invoice amount' })
  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;
}
