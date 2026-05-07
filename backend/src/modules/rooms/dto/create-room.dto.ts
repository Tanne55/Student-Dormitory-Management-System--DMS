import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsString, IsUUID, Min } from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({ description: 'ID tầng (floors.id)' })
  @IsUUID()
  floorId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  roomNumber: string;

  @ApiProperty({ description: 'ID loại phòng (từ bảng room_types)' })
  @IsInt()
  @Min(1)
  roomTypeId: number;

  @ApiProperty({ example: 'Mixed' })
  @IsString()
  @IsIn(['Male', 'Female', 'Mixed', 'Nam', 'Nữ'])
  gender: string;
}
