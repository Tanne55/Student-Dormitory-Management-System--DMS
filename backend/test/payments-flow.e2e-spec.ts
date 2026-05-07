import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { Invoice, InvoiceStatus } from '../src/modules/invoices/entities/invoice.entity';
import { Room } from '../src/modules/rooms/entities/room.entity';
import { RoomType } from '../src/modules/rooms/entities/room-type.entity';
import { createRoomsPaymentsE2eApp } from './create-rooms-payments-e2e-app';
import { seedBuildingAndFloor } from './e2e-seed';

describe('Payments flow (e2e)', () => {
  let app: INestApplication<App>;
  let floorId: string;

  beforeEach(async () => {
    app = await createRoomsPaymentsE2eApp();
    const ds = app.get(DataSource);
    await ds.getRepository(RoomType).save({
      name: 'Loại 4 chỗ',
      capacity: 4,
      monthlyPrice: 800000,
    });
    const { floor } = await seedBuildingAndFloor(ds);
    floorId = floor.id;
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  async function seedUnpaidInvoice(totalAmount: number) {
    const ds = app.get(DataSource);
    const room = await ds.getRepository(Room).save(
      ds.getRepository(Room).create({
        floorId,
        roomNumber: `PAY-${Date.now()}`,
        roomType: 4,
        gender: 'Mixed',
        capacity: 4,
        currentOccupancy: 0,
        status: 'AVAILABLE',
      }),
    );
    const invoice = await ds.getRepository(Invoice).save(
      ds.getRepository(Invoice).create({
        room,
        month: '2026-04',
        electricFee: 0,
        waterFee: 0,
        totalAmount,
        status: InvoiceStatus.UNPAID,
        dueDate: new Date('2026-04-30'),
        paidBy: null,
        paidAt: null,
      }),
    );
    return { room, invoice };
  }

  it('POST /payments: thanh toán đủ 1 lần → hóa đơn PAID + lịch sử GET /payments/invoice/:id', async () => {
    const { invoice } = await seedUnpaidInvoice(350_000);

    const payRes = await request(app.getHttpServer())
      .post('/payments')
      .send({
        invoiceId: invoice.id,
        payerStudentCode: 'SV001',
        amount: 350_000,
        method: 'CASH',
      })
      .expect(201);

    expect(payRes.body.amount).toBe(350_000);
    expect(payRes.body.id).toBeDefined();

    const ds = app.get(DataSource);
    const reloaded = await ds.getRepository(Invoice).findOne({ where: { id: invoice.id } });
    expect(reloaded?.status).toBe(InvoiceStatus.PAID);
    expect(reloaded?.paidBy).toBe('SV001');

    const hist = await request(app.getHttpServer()).get(`/payments/invoice/${invoice.id}`).expect(200);

    expect(Array.isArray(hist.body)).toBe(true);
    expect(hist.body.length).toBe(1);
    expect(hist.body[0].amount).toBe(350_000);
  });

  it('POST /payments: từ chối khi số tiền khác tổng hóa đơn', async () => {
    const { invoice } = await seedUnpaidInvoice(200_000);

    await request(app.getHttpServer())
      .post('/payments')
      .send({
        invoiceId: invoice.id,
        amount: 199_999,
        payerStudentCode: 'SV002',
      })
      .expect(400)
      .expect((res) => {
        expect(String(res.body.message)).toContain('đủ 1 lần');
      });
  });

  it('POST /payments: từ chối thanh toán lần 2 khi đã PAID', async () => {
    const { invoice } = await seedUnpaidInvoice(100_000);

    await request(app.getHttpServer())
      .post('/payments')
      .send({ invoiceId: invoice.id, amount: 100_000, payerStudentCode: 'SV003' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/payments')
      .send({ invoiceId: invoice.id, amount: 100_000, payerStudentCode: 'SV003' })
      .expect(400)
      .expect((res) => {
        expect(String(res.body.message)).toContain('đã được thanh toán');
      });
  });
});
