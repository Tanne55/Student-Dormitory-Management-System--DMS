import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum DormExtensionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('dorm_extensions')
export class DormExtension {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id', type: 'int' })
  accountId: number;

  @Column({ name: 'student_code', type: 'varchar', length: 50 })
  studentCode: string;

  @Column({ name: 'room_id', type: 'varchar', length: 36 })
  roomId: string;

  @Column({ name: 'room_number', type: 'varchar', length: 50, nullable: true })
  roomNumber: string;

  @Column({ type: 'varchar', length: 50 })
  semester: string;

  @Column({ type: 'enum', enum: DormExtensionStatus, default: DormExtensionStatus.PENDING })
  status: DormExtensionStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
