import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomType } from './entities/room-type.entity';
import { Floor } from '../buildings/entities/floor.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { Room, RoomStatus } from './entities/room.entity';
import { AccessActor, ScopeService } from '../staffs/scope.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room) private readonly roomRepo: Repository<Room>,
    @InjectRepository(RoomType) private readonly roomTypeRepo: Repository<RoomType>,
    @InjectRepository(Floor) private readonly floorRepo: Repository<Floor>,
    private readonly scopeService: ScopeService,
    private readonly auditService: AuditService,
  ) {}

  private async roomTypePriceMap(): Promise<Map<number, number>> {
    const types = await this.roomTypeRepo.find();
    return new Map(types.map((t) => [t.roomTypeId, Number(t.monthlyPrice)]));
  }

  private withDerived(room: Room, prices: Map<number, number>) {
    const floor = room.floor;
    const building = floor?.building;
    return {
      id: room.id,
      floorId: room.floorId,
      roomNumber: room.roomNumber,
      roomTypeId: room.roomTypeId,
      gender: room.gender,
      capacity: room.capacity,
      currentOccupancy: room.currentOccupancy,
      status: room.status,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      deletedAt: room.deletedAt,
      monthlyPrice: prices.get(room.roomTypeId) ?? null,
      buildingCode: building?.code ?? null,
      buildingName: building?.name ?? null,
      floorNumber: floor?.floorNumber ?? null,
      floorLabel: floor?.label ?? null,
    };
  }

  async getRoomTypes() {
    return this.roomTypeRepo.find({ order: { capacity: 'ASC', monthlyPrice: 'ASC' } });
  }

  async findAll(actor: AccessActor) {
    const scope = await this.scopeService.getFloorScope(actor);
    const qb = this.roomRepo
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.floor', 'floor')
      .leftJoinAndSelect('floor.building', 'building')
      .orderBy('building.code', 'ASC')
      .addOrderBy('floor.floorNumber', 'ASC')
      .addOrderBy('room.roomNumber', 'ASC');
    if (scope !== 'all') {
      qb.andWhere('room.floor_id IN (:...ids)', { ids: scope });
    }
    const rooms = await qb.getMany();
    const prices = await this.roomTypePriceMap();
    return rooms.map((r) => this.withDerived(r, prices));
  }

  async findOne(id: string, actor: AccessActor) {
    const room = await this.roomRepo.findOne({
      where: { id },
      relations: ['floor', 'floor.building'],
    });
    if (!room) throw new NotFoundException('Không tìm thấy phòng.');
    await this.scopeService.assertRoomFloorInScope(actor, room.floorId);
    const prices = await this.roomTypePriceMap();
    return this.withDerived(room, prices);
  }

  async create(dto: CreateRoomDto) {
    const floor = await this.floorRepo.findOne({ where: { id: dto.floorId } });
    if (!floor) throw new BadRequestException('Tầng không tồn tại.');
    const existing = await this.roomRepo.findOne({
      where: { floorId: dto.floorId, roomNumber: dto.roomNumber.trim() },
    });
    if (existing) {
      throw new BadRequestException(`Số phòng ${dto.roomNumber} đã tồn tại trên tầng này.`);
    }

    const roomTypeInfo = await this.roomTypeRepo.findOne({ where: { roomTypeId: dto.roomTypeId } });
    if (!roomTypeInfo) {
      throw new BadRequestException('Mã loại phòng không hợp lệ.');
    }

    const room = this.roomRepo.create({
      floorId: dto.floorId,
      roomNumber: dto.roomNumber.trim(),
      roomTypeId: dto.roomTypeId,
      gender: dto.gender,
      capacity: roomTypeInfo.capacity,
      currentOccupancy: 0,
      status: RoomStatus.AVAILABLE,
    });
    const saved = await this.roomRepo.save(room);
    const reloaded = await this.roomRepo.findOne({
      where: { id: saved.id },
      relations: ['floor', 'floor.building'],
    });
    const prices = await this.roomTypePriceMap();
    return this.withDerived(reloaded!, prices);
  }

  async update(id: string, dto: UpdateRoomDto) {
    const room = await this.roomRepo.findOne({
      where: { id },
      relations: ['floor', 'floor.building'],
    });
    if (!room) throw new NotFoundException('Không tìm thấy phòng.');
    if (dto.floorId != null && dto.floorId !== room.floorId) {
      const floor = await this.floorRepo.findOne({ where: { id: dto.floorId } });
      if (!floor) throw new BadRequestException('Tầng không tồn tại.');
      room.floorId = dto.floorId;
    }
    const effectiveFloorId = room.floorId;
    if (dto.roomNumber && dto.roomNumber.trim() !== room.roomNumber) {
      const dup = await this.roomRepo.findOne({
        where: { floorId: effectiveFloorId, roomNumber: dto.roomNumber.trim() },
      });
      if (dup && dup.id !== room.id) {
        throw new BadRequestException(`Số phòng ${dto.roomNumber} đã tồn tại trên tầng này.`);
      }
      room.roomNumber = dto.roomNumber.trim();
    }
    if (dto.roomTypeId != null && dto.roomTypeId !== room.roomTypeId) {
      const roomTypeInfo = await this.roomTypeRepo.findOne({ where: { roomTypeId: dto.roomTypeId } });
      if (!roomTypeInfo) {
        throw new BadRequestException('Mã loại phòng không hợp lệ.');
      }
      if (roomTypeInfo.capacity < room.currentOccupancy) {
        throw new BadRequestException('Sức chứa của loại phòng mới không được nhỏ hơn số người đang ở.');
      }
      room.roomTypeId = dto.roomTypeId;
      room.capacity = roomTypeInfo.capacity;
      
      if (room.currentOccupancy >= room.capacity) room.status = RoomStatus.FULL;
      else if (room.status === RoomStatus.FULL) room.status = RoomStatus.AVAILABLE;
    }
    
    if (dto.gender) room.gender = dto.gender;
    const saved = await this.roomRepo.save(room);
    const reloaded = await this.roomRepo.findOne({
      where: { id: saved.id },
      relations: ['floor', 'floor.building'],
    });
    const prices = await this.roomTypePriceMap();
    return this.withDerived(reloaded!, prices);
  }

  async updateStatus(
    id: string,
    status: RoomStatus,
    audit?: { actorAccountId?: number | null; ip?: string | null },
  ) {
    const room = await this.roomRepo.findOne({
      where: { id },
      relations: ['floor', 'floor.building'],
    });
    if (!room) throw new NotFoundException('Không tìm thấy phòng.');
    if (status === RoomStatus.MAINTENANCE && room.currentOccupancy > 0) {
      throw new BadRequestException('Không thể chuyển phòng sang bảo trì khi còn sinh viên đang ở.');
    }
    room.status = status;
    const saved = await this.roomRepo.save(room);
    const reloaded = await this.roomRepo.findOne({
      where: { id: saved.id },
      relations: ['floor', 'floor.building'],
    });
    const prices = await this.roomTypePriceMap();
    await this.auditService.log({
      actorAccountId: audit?.actorAccountId ?? null,
      action: 'room.status_change',
      entityType: 'room',
      entityId: id,
      metadata: { toStatus: status },
      ip: audit?.ip ?? null,
    });
    return this.withDerived(reloaded!, prices);
  }

  async softDelete(id: string, audit?: { actorAccountId?: number | null; ip?: string | null }) {
    const room = await this.roomRepo.findOne({ where: { id } });
    if (!room) throw new NotFoundException('Không tìm thấy phòng.');
    if (room.currentOccupancy > 0) {
      throw new BadRequestException('Không thể xóa phòng còn sinh viên đang ở.');
    }
    await this.roomRepo.softDelete(id);
    await this.auditService.log({
      actorAccountId: audit?.actorAccountId ?? null,
      action: 'room.soft_delete',
      entityType: 'room',
      entityId: id,
      metadata: {},
      ip: audit?.ip ?? null,
    });
    return { success: true };
  }
}
