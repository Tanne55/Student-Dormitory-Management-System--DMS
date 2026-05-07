import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, OneToMany, JoinColumn } from 'typeorm';
import { Account } from '../../auth/entities/account.entity';
import { StudentProfile } from './student-profile.entity';
import { EmergencyContact } from './emergency-contact.entity';

export enum StudentLivingStatus {
    PENDING = 'PENDING',
    LIVING = 'LIVING',
    LEFT = 'LEFT'
}

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Account)
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @Column({ name: 'account_id' })
  accountId: number;

  @Column({ name: 'student_code', length: 20, unique: true })
  studentCode: string;

  @Column({ name: 'full_name', length: 100 })
  fullName: string;

  @Column({ type: 'date' })
  dob: Date;

  @Column({ length: 10 })
  gender: string;

  @Column({ length: 15 })
  phone: string;

  @Column({ name: 'email_personal', length: 100 })
  emailPersonal: string;

  @Column({ name: 'email_school', length: 100, nullable: true })
  emailSchool: string;

  @Column({ length: 20, nullable: true })
  cohort: string;

  @Column({ length: 100, nullable: true })
  faculty: string;

  @Column({ length: 100, nullable: true })
  major: string;

  @Column({ name: 'class_name', length: 50, nullable: true })
  className: string;

  @Column({ type: 'enum', enum: StudentLivingStatus, default: StudentLivingStatus.PENDING })
  livingStatus: StudentLivingStatus;

  @OneToOne(() => StudentProfile, profile => profile.student, { cascade: true })
  profile: StudentProfile;

  @OneToMany(() => EmergencyContact, contact => contact.student, { cascade: true })
  contacts: EmergencyContact[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
