import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Room } from '../../rooms/entities/room.entity';
import { Payment } from '../../payments/entities/payment.entity';

export enum InvoiceStatus {
  UNPAID = 'UNPAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Room, { nullable: false })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @OneToMany(() => Payment, (payment) => payment.invoice)
  payments: Payment[];

  @Column({ type: 'varchar', length: 7 })
  month: string; // "yyyy-MM" format

  @Column({ name: 'electric_fee', type: 'int', default: 0 })
  electricFee: number;

  @Column({ name: 'water_fee', type: 'int', default: 0 })
  waterFee: number;

  @Column({ name: 'total_amount', type: 'int', default: 0 })
  totalAmount: number;

  @Column({ type: 'simple-enum', enum: InvoiceStatus, default: InvoiceStatus.UNPAID })
  status: InvoiceStatus;

  @Column({ name: 'due_date', type: 'datetime' })
  dueDate: Date;

  @Column({ name: 'paid_by', type: 'varchar', length: 50, nullable: true })
  paidBy: string | null; // Mã SV người thanh toán

  @Column({ name: 'paid_at', type: 'datetime', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
