import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export enum AccessDirection {
  IN = 'IN',
  OUT = 'OUT',
}

@Entity('access_logs')
export class AccessLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'student_code', type: 'varchar', length: 50 })
  studentCode: string;

  @Column({ type: 'enum', enum: AccessDirection })
  direction: AccessDirection;

  @Column({ type: 'float', nullable: true })
  confidence: number | null; // 1 - euclidean_distance, range 0.0–1.0

  @Column({ name: 'building_code', type: 'varchar', length: 50, nullable: true })
  buildingCode: string | null;

  @CreateDateColumn({ name: 'logged_at' })
  loggedAt: Date;
}
