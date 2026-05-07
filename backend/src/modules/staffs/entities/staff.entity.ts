import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('staffs')
export class Staff {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'account_id', type: 'int', unique: true })
    accountId: number;

    @Column({ name: 'staff_code', type: 'varchar', length: 50, unique: true })
    staffCode: string;

    @Column({ name: 'full_name', type: 'varchar', length: 150 })
    fullName: string;

    @Column({ type: 'varchar', length: 20 })
    phone: string;

    @Column({ type: 'varchar', length: 150, unique: true })
    email: string;

    @Column({ name: 'id_card_number', type: 'varchar', length: 20 })
    idCardNumber: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
