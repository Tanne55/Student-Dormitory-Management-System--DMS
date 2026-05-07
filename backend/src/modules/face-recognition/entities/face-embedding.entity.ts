import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('face_embeddings')
export class FaceEmbedding {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'student_code', type: 'varchar', length: 50, unique: true })
  studentCode: string;

  @Column({ type: 'text' })
  descriptor: string; // JSON-serialized number[128]

  @Column({ name: 'enrolled_by', type: 'int', nullable: true })
  enrolledBy: number | null; // account_id của staff/admin thực hiện đăng ký

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
