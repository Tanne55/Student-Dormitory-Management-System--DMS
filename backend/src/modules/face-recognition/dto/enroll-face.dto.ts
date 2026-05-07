import { IsString, IsArray, IsNumber, ArrayMinSize, ArrayMaxSize, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EnrollFaceDto {
  @ApiProperty({ description: 'Mã sinh viên' })
  @IsString()
  studentCode: string;

  @ApiProperty({ description: 'Face descriptor — mảng 128 số thực từ face-api.js' })
  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(128)
  @ArrayMaxSize(128)
  descriptor: number[];
}
