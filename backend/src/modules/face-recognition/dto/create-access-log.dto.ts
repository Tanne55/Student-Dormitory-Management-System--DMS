import { IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccessDirection } from '../entities/access-log.entity';

export class CreateAccessLogDto {
  @ApiProperty({ description: 'Mã sinh viên' })
  @IsString()
  studentCode: string;

  @ApiProperty({ enum: AccessDirection, description: 'Hướng ra/vào' })
  @IsEnum(AccessDirection)
  direction: AccessDirection;

  @ApiProperty({ description: 'Độ tin cậy nhận diện (0.0–1.0)', required: false })
  @IsOptional()
  @IsNumber()
  confidence?: number;

  @ApiProperty({ description: 'Mã tòa nhà', required: false })
  @IsOptional()
  @IsString()
  buildingCode?: string;
}
