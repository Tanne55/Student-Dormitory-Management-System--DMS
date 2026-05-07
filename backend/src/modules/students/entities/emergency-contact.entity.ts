import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Student } from './student.entity';

@Entity('emergency_contacts')
export class EmergencyContact {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Student, student => student.contacts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'student_id', nullable: true })
  studentId: number;

  @Column({ name: 'full_name', length: 100 })
  fullName: string;

  @Column({ length: 50 })
  relationship: string;

  @Column({ length: 15 })
  phone: string;

  @Column({ length: 255 })
  address: string;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean;
}
