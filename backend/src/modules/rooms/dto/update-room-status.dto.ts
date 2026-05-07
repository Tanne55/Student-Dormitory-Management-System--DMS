import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { RoomStatus } from '../entities/room.entity';

export class UpdateRoomStatusDto {
  @ApiProperty({ enum: RoomStatus })
  @IsEnum(RoomStatus)
  status: RoomStatus;
}
