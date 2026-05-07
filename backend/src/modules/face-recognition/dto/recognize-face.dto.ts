import { IsArray, IsNumber, ArrayMinSize, ArrayMaxSize, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RecognizeFaceDto {
  @ApiProperty({ description: 'Face descriptor — mảng 128 số thực từ face-api.js' })
  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(128)
  @ArrayMaxSize(128)
  descriptor: number[];

  @ApiProperty({ description: 'Mã tòa nhà (nếu có nhiều cổng)', required: false })
  @IsOptional()
  @IsString()
  buildingCode?: string;
}
