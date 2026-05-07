import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

export enum AccountRole {
  ADMIN = 'admin',
  STAFF = 'staff',
  STUDENT = 'student'
}

export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  LOCKED = 'locked'
}

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn({ name: 'account_id' })
  accountId: number;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @Column({ type: 'enum', enum: AccountRole })
  role: AccountRole;

  @Column({ type: 'enum', enum: AccountStatus, default: AccountStatus.ACTIVE })
  status: AccountStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  // Additional columns for Forgot Password functionality
  @Column({ name: 'reset_password_token', nullable: true })
  resetPasswordToken?: string;

  @Column({ name: 'reset_password_expires', nullable: true })
  resetPasswordExpires?: Date;
}
