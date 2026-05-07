import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

@Entity('room_types')
export class RoomType {
    @PrimaryGeneratedColumn({ name: 'room_type_id' })
    roomTypeId: number;

    @Column({ type: 'varchar', length: 50 })
    name: string;

    @Column({ type: 'int' })
    capacity: number;

    @Column({ name: 'monthly_price', type: 'decimal', precision: 12, scale: 2 })
    monthlyPrice: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at', nullable: true })
    deletedAt?: Date;
}
