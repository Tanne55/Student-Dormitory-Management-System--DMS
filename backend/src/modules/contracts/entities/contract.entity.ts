import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ContractStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED',
  CHECKED_OUT = 'CHECKED_OUT',
  BAD_DEBT = 'BAD_DEBT'
}

@Entity('contracts')
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contract_code', unique: true, length: 50 })
  contractCode: string;

  @Column({ name: 'student_code', length: 50 })
  studentCode: string;

  @Column({ name: 'room_id', length: 36 })
  roomId: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate: Date;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2 })
  totalAmount: number;

  @Column({ name: 'created_by_staff', nullable: true, length: 50 })
  createdByStaff: string;

  @Column({ type: 'enum', enum: ContractStatus, default: ContractStatus.ACTIVE })
  status: ContractStatus;

  // Checkout settlement fields
  @Column({ name: 'actual_end_date', type: 'date', nullable: true })
  actualEndDate: Date;

  @Column({ name: 'utility_fee', type: 'decimal', precision: 12, scale: 2, nullable: true })
  utilityFee: number;

  @Column({ name: 'damage_fee', type: 'decimal', precision: 12, scale: 2, nullable: true })
  damageFee: number;

  @Column({ name: 'deposit_refund', type: 'decimal', precision: 12, scale: 2, nullable: true })
  depositRefund: number;

  @Column({ name: 'final_settlement', type: 'decimal', precision: 12, scale: 2, nullable: true })
  finalSettlement: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

