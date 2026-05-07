import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum RepairCategory {
  ELECTRIC = 'ELECTRIC',
  WATER = 'WATER',
  FURNITURE = 'FURNITURE',
  OTHER = 'OTHER',
}

export enum RepairStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  RESOLVED = 'RESOLVED',
}

@Entity('repair_requests')
export class RepairRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id', type: 'int' })
  accountId: number;

  @Column({ name: 'student_code', type: 'varchar', length: 50, nullable: true })
  studentCode: string;

  @Column({ name: 'room_number', type: 'varchar', length: 50 })
  roomNumber: string;

  @Column({ name: 'room_id', type: 'varchar', length: 36, nullable: true })
  roomId: string | null;

  @Column({ type: 'enum', enum: RepairCategory })
  category: RepairCategory;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'attachment_url', type: 'varchar', length: 255, nullable: true })
  attachmentUrl: string;

  @Column({ type: 'enum', enum: RepairStatus, default: RepairStatus.PENDING })
  status: RepairStatus;

  // Staff processing fields
  @Column({ name: 'staff_note', type: 'text', nullable: true })
  staffNote: string;

  @Column({ name: 'resolved_by', type: 'int', nullable: true })
  resolvedBy: number;

  @Column({ name: 'resolved_at', type: 'datetime', nullable: true })
  resolvedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
