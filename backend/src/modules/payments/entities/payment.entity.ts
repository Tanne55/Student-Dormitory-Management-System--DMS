import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Invoice } from '../../invoices/entities/invoice.entity';

export enum PaymentStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  OTHER = 'OTHER',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Invoice, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'simple-enum', enum: PaymentMethod, default: PaymentMethod.CASH })
  method: PaymentMethod;

  @Column({ type: 'simple-enum', enum: PaymentStatus, default: PaymentStatus.SUCCESS })
  status: PaymentStatus;

  @Column({ name: 'payer_student_code', type: 'varchar', length: 50, nullable: true })
  payerStudentCode: string | null;

  @Column({ name: 'confirmed_by_account_id', type: 'int', nullable: true })
  confirmedByAccountId: number | null;

  @Column({ name: 'paid_at', type: 'datetime' })
  paidAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
