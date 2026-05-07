import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Staff } from './staff.entity';
import { Floor } from '../../buildings/entities/floor.entity';

@Entity('staff_floor_scopes')
@Unique('UQ_staff_floor_scope', ['staffId', 'floorId'])
export class StaffFloorScope {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'staff_id', type: 'varchar', length: 36 })
  staffId: string;

  @ManyToOne(() => Staff, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_id' })
  staff: Staff;

  @Column({ name: 'floor_id', type: 'varchar', length: 36 })
  floorId: string;

  @ManyToOne(() => Floor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'floor_id' })
  floor: Floor;
}
