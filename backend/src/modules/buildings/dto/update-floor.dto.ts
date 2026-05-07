import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateFloorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  floorNumber?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string | null;
}
