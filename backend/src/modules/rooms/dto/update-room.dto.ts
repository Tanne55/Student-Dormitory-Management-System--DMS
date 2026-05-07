import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class UpdateRoomDto {
  @ApiPropertyOptional({ description: 'Chuyển phòng sang tầng khác' })
  @IsOptional()
  @IsUUID()
  floorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roomNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  roomTypeId?: number;

  @ApiPropertyOptional({ example: 'Mixed' })
  @IsOptional()
  @IsString()
  @IsIn(['Male', 'Female', 'Mixed', 'Nam', 'Nữ'])
  gender?: string;
}
