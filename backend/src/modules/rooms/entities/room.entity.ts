import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Floor } from '../../buildings/entities/floor.entity';
import { RoomType } from './room-type.entity';

export enum RoomStatus {
  AVAILABLE = 'AVAILABLE',
  FULL = 'FULL',
  MAINTENANCE = 'MAINTENANCE',
}

@Entity('rooms')
@Unique('UQ_rooms_floor_room_number', ['floorId', 'roomNumber'])
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'floor_id', type: 'varchar', length: 36 })
  floorId: string;

  @ManyToOne(() => Floor, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'floor_id' })
  floor: Floor;

  @Column({ name: 'room_number', type: 'varchar', length: 50 })
  roomNumber: string;

  @Column({ name: 'room_type_id', type: 'int' })
  roomTypeId: number;

  @ManyToOne(() => RoomType, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'room_type_id' })
  roomTypeObj: RoomType;

  @Column({ type: 'varchar', length: 20, default: 'Mixed' })
  gender: string;

  @Column({ type: 'int' })
  capacity: number;

  @Column({ name: 'current_occupancy', type: 'int', default: 0 })
  currentOccupancy: number;

  @Column({ type: 'simple-enum', enum: RoomStatus, default: RoomStatus.AVAILABLE })
  status: RoomStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}
