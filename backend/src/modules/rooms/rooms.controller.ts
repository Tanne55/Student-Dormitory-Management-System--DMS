import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { UpdateRoomStatusDto } from './dto/update-room-status.dto';
import { AccessActor } from '../staffs/scope.service';

@ApiTags('rooms')
@ApiBearerAuth()
@Controller('rooms')
@Roles('staff', 'admin')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  private actor(req: { user?: { accountId?: number; role?: string } }): AccessActor {
    return { accountId: Number(req.user?.accountId), role: String(req.user?.role ?? '') };
  }

  @Get()
  findAll(@Req() req: any) {
    return this.roomsService.findAll(this.actor(req));
  }

  @Get('room-types')
  @Roles('student', 'staff', 'admin') // Everyone needs to see room types
  getRoomTypes() {
    return this.roomsService.getRoomTypes();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.roomsService.findOne(id, this.actor(req));
  }

  @Roles('admin')
  @Post()
  create(@Body() dto: CreateRoomDto) {
    return this.roomsService.create(dto);
  }

  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRoomDto) {
    return this.roomsService.update(id, dto);
  }

  @Roles('admin')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateRoomStatusDto, @Req() req: any) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
    return this.roomsService.updateStatus(id, dto.status, {
      actorAccountId: req.user?.accountId,
      ip,
    });
  }

  @Roles('admin')
  @Delete(':id')
  softDelete(@Param('id') id: string, @Req() req: any) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
    return this.roomsService.softDelete(id, { actorAccountId: req.user?.accountId, ip });
  }
}
