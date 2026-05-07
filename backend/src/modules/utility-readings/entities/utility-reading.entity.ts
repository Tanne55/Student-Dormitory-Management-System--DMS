import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('utility_readings')
export class UtilityReading {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'room_id', type: 'varchar', length: 36 })
    roomId: string;

    @Column({ type: 'varchar', length: 7 })
    month: string; // yyyy-MM

    @Column({ name: 'electric_reading', type: 'int', default: 0 })
    electricReading: number;

    @Column({ name: 'water_reading', type: 'int', default: 0 })
    waterReading: number;

    @Column({ name: 'recorded_by', type: 'int', nullable: true })
    recordedBy: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
