import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class SetStaffFloorScopesDto {
  @ApiProperty({ type: [String], description: 'Danh sách id tầng (floors.id); mảng rỗng = xóa hết phạm vi' })
  @IsArray()
  @IsUUID('4', { each: true })
  floorIds: string[];
}
