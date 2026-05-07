import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Building } from './building.entity';

@Entity('floors')
@Unique('UQ_floors_building_floor_number', ['buildingId', 'floorNumber'])
export class Floor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'building_id', type: 'varchar', length: 36 })
  buildingId: string;

  @ManyToOne(() => Building, (b) => b.floors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'building_id' })
  building: Building;

  @Column({ name: 'floor_number', type: 'int' })
  floorNumber: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  label: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
