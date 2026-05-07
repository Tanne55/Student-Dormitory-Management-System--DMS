import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateFloorDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(0)
  floorNumber: number;

  @ApiPropertyOptional({ example: 'Tầng lững' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string | null;
}
