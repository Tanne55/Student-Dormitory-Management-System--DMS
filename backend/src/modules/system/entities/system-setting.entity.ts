import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('system_settings')
export class SystemSetting {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  key: string;

  @Column({ type: 'varchar', length: 255 })
  value: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
