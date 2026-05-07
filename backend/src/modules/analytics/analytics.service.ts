import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room, RoomStatus } from '../rooms/entities/room.entity';
import { Invoice, InvoiceStatus } from '../invoices/entities/invoice.entity';
import { RepairRequest, RepairStatus } from '../repair-requests/entities/repair-request.entity';
import { DormExtension, DormExtensionStatus } from '../dorm-extensions/entities/dorm-extension.entity';
import { Contract, ContractStatus } from '../contracts/entities/contract.entity';

@Injectable()
export class AnalyticsService {
    constructor(
        @InjectRepository(Room) private roomRepo: Repository<Room>,
        @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
        @InjectRepository(RepairRequest) private repairRepo: Repository<RepairRequest>,
        @InjectRepository(DormExtension) private extensionRepo: Repository<DormExtension>,
        @InjectRepository(Contract) private contractRepo: Repository<Contract>,
    ) {}

    async getDashboardStats() {
        // 1. Room Occupancy
        const allRooms = await this.roomRepo.find();
        const totalRooms = allRooms.length;
        const totalCapacity = allRooms.reduce((sum, r) => sum + r.capacity, 0);
        const totalOccupied = allRooms.reduce((sum, r) => sum + r.currentOccupancy, 0);
        const availableRooms = allRooms.filter(r => r.status === RoomStatus.AVAILABLE).length;
        const fullRooms = allRooms.filter(r => r.status === RoomStatus.FULL).length;
        const maintenanceRooms = allRooms.filter(r => r.status === RoomStatus.MAINTENANCE).length;

        // 2. Financial (Current month)
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const allInvoices = await this.invoiceRepo.find({ where: { month: currentMonth } });
        const totalRevenue = allInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
        const paidRevenue = allInvoices.filter(i => i.status === InvoiceStatus.PAID).reduce((sum, inv) => sum + inv.totalAmount, 0);
        const unpaidRevenue = totalRevenue - paidRevenue;
        const invoiceCount = allInvoices.length;
        const paidCount = allInvoices.filter(i => i.status === InvoiceStatus.PAID).length;

        // Monthly revenue for bar chart (last 6 months)
        const monthlyRevenue: any[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const monthInvoices = await this.invoiceRepo.find({ where: { month: m } });
            const paid = monthInvoices.filter(inv => inv.status === InvoiceStatus.PAID).reduce((s, inv) => s + inv.totalAmount, 0);
            const unpaid = monthInvoices.filter(inv => inv.status === InvoiceStatus.UNPAID).reduce((s, inv) => s + inv.totalAmount, 0);
            monthlyRevenue.push({ month: m, paid, unpaid, total: paid + unpaid });
        }

        // 3. Operations
        const pendingRepairs = await this.repairRepo.count({ where: { status: RepairStatus.PENDING } });
        const processingRepairs = await this.repairRepo.count({ where: { status: RepairStatus.PROCESSING } });
        const resolvedRepairs = await this.repairRepo.count({ where: { status: RepairStatus.RESOLVED } });

        const pendingExtensions = await this.extensionRepo.count({ where: { status: DormExtensionStatus.PENDING } });

        const activeContracts = await this.contractRepo.count({ where: { status: ContractStatus.ACTIVE } });

        return {
            occupancy: {
                totalRooms,
                totalCapacity,
                totalOccupied,
                occupancyRate: totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0,
                availableRooms,
                fullRooms,
                maintenanceRooms,
            },
            financial: {
                currentMonth,
                invoiceCount,
                paidCount,
                totalRevenue,
                paidRevenue,
                unpaidRevenue,
                monthlyRevenue,
            },
            operations: {
                pendingRepairs,
                processingRepairs,
                resolvedRepairs,
                pendingExtensions,
                activeContracts,
            }
        };
    }
}
