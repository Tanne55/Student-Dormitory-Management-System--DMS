import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Building } from './entities/building.entity';
import { Floor } from './entities/floor.entity';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';
import { Room } from '../rooms/entities/room.entity';

@Injectable()
export class BuildingsService {
  constructor(
    @InjectRepository(Building) private readonly buildingRepo: Repository<Building>,
    @InjectRepository(Floor) private readonly floorRepo: Repository<Floor>,
  ) {}

  async findAllBuildings() {
    return this.buildingRepo.find({ order: { code: 'ASC' } });
  }

  async findOneBuilding(id: string) {
    const b = await this.buildingRepo.findOne({ where: { id } });
    if (!b) throw new NotFoundException('Không tìm thấy tòa.');
    return b;
  }

  async createBuilding(dto: CreateBuildingDto) {
    const dup = await this.buildingRepo.findOne({ where: { code: dto.code.trim() } });
    if (dup) throw new BadRequestException(`Mã tòa ${dto.code} đã tồn tại.`);
    return this.buildingRepo.save(
      this.buildingRepo.create({
        code: dto.code.trim(),
        name: dto.name.trim(),
        address: dto.address?.trim() ?? null,
      }),
    );
  }

  async updateBuilding(id: string, dto: UpdateBuildingDto) {
    const b = await this.buildingRepo.findOne({ where: { id } });
    if (!b) throw new NotFoundException('Không tìm thấy tòa.');
    if (dto.code != null && dto.code.trim() !== b.code) {
      const dup = await this.buildingRepo.findOne({ where: { code: dto.code.trim() } });
      if (dup) throw new BadRequestException(`Mã tòa ${dto.code} đã tồn tại.`);
      b.code = dto.code.trim();
    }
    if (dto.name != null) b.name = dto.name.trim();
    if (dto.address !== undefined) b.address = dto.address?.trim() ?? null;
    return this.buildingRepo.save(b);
  }

  async deleteBuilding(id: string) {
    const b = await this.buildingRepo.findOne({ where: { id } });
    if (!b) throw new NotFoundException('Không tìm thấy tòa.');
    const floors = await this.floorRepo.find({ where: { buildingId: id }, select: ['id'] });
    for (const f of floors) {
      const n = await this.floorRepo.manager.count(Room, { where: { floorId: f.id } });
      if (n > 0) throw new BadRequestException('Không thể xóa tòa đang có phòng.');
    }
    await this.buildingRepo.remove(b);
    return { success: true };
  }

  async listFloors(buildingId: string) {
    await this.findOneBuilding(buildingId);
    return this.floorRepo.find({
      where: { buildingId },
      order: { floorNumber: 'ASC' },
    });
  }

  async createFloor(buildingId: string, dto: CreateFloorDto) {
    await this.findOneBuilding(buildingId);
    const dup = await this.floorRepo.findOne({
      where: { buildingId, floorNumber: dto.floorNumber },
    });
    if (dup) throw new BadRequestException('Số tầng đã tồn tại trong tòa này.');
    return this.floorRepo.save(
      this.floorRepo.create({
        buildingId,
        floorNumber: dto.floorNumber,
        label: dto.label?.trim() ?? null,
      }),
    );
  }

  async findFloor(id: string) {
    const f = await this.floorRepo.findOne({ where: { id }, relations: ['building'] });
    if (!f) throw new NotFoundException('Không tìm thấy tầng.');
    return f;
  }

  async updateFloor(id: string, dto: UpdateFloorDto) {
    const f = await this.floorRepo.findOne({ where: { id } });
    if (!f) throw new NotFoundException('Không tìm thấy tầng.');
    if (dto.floorNumber != null && dto.floorNumber !== f.floorNumber) {
      const dup = await this.floorRepo.findOne({
        where: { buildingId: f.buildingId, floorNumber: dto.floorNumber },
      });
      if (dup) throw new BadRequestException('Số tầng đã tồn tại trong tòa này.');
      f.floorNumber = dto.floorNumber;
    }
    if (dto.label !== undefined) f.label = dto.label?.trim() ?? null;
    return this.floorRepo.save(f);
  }

  async deleteFloor(id: string) {
    const f = await this.floorRepo.findOne({ where: { id } });
    if (!f) throw new NotFoundException('Không tìm thấy tầng.');
    const n = await this.floorRepo.manager.count(Room, { where: { floorId: id } });
    if (n > 0) throw new BadRequestException('Không thể xóa tầng đang có phòng.');
    await this.floorRepo.remove(f);
    return { success: true };
  }
}
