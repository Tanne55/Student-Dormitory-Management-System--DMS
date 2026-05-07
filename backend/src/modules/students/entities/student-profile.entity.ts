import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Student } from './student.entity';

export enum PriorityGroup {
  NONE = 'None',
  PRIORITY_1 = 'Priority 1',
  PRIORITY_2 = 'Priority 2',
  PRIORITY_3 = 'Priority 3',
  PRIORITY_4 = 'Priority 4',
  PRIORITY_5 = 'Priority 5',
  PRIORITY_6 = 'Priority 6'
}

@Entity('student_profiles')
export class StudentProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Student, student => student.profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'student_id', nullable: true })
  studentId: number;

  @Column({ name: 'id_card_number', length: 20 })
  idCardNumber: string;

  @Column({ name: 'id_card_issued_date', type: 'date' })
  idCardIssuedDate: Date;

  @Column({ length: 50 })
  nation: string;

  @Column({ name: 'birth_place', length: 100 })
  birthPlace: string;

  @Column({ length: 50 })
  ethnicity: string;

  @Column({ length: 50 })
  religion: string;

  @Column({ length: 100 })
  province: string;

  @Column({ length: 100 })
  district: string;

  @Column({ length: 100 })
  ward: string;

  @Column({ name: 'address_detail', length: 255 })
  addressDetail: string;

  @Column({ name: 'priority_group', type: 'enum', enum: PriorityGroup, default: PriorityGroup.NONE })
  priorityGroup: PriorityGroup;
}
