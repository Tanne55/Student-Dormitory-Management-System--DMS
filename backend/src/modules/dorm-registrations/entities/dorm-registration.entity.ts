import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum DormRegistrationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
}

@Entity('dorm_registrations')
export class DormRegistration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_code', type: 'varchar', length: 50 })
  studentCode: string;

  @Column({ name: 'application_data', type: 'json' })
  applicationData: Record<string, any>;

  @Column({ name: 'room_type', type: 'int' })
  roomType: number; // 4, 6, 8

  @Column({ type: 'varchar', length: 50 })
  semester: string;

  @Column({ name: 'priority_type', type: 'varchar', length: 255, nullable: true })
  priorityType: string;

  @Column({ name: 'priority_proof_url', type: 'varchar', length: 255, nullable: true })
  priorityProofUrl: string;

  @Column({ type: 'enum', enum: DormRegistrationStatus, default: DormRegistrationStatus.PENDING })
  status: DormRegistrationStatus;

  @Column({ name: 'room_id', type: 'varchar', length: 36, nullable: true })
  roomId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
