import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { Room } from '../src/modules/rooms/entities/room.entity';
import { RoomType } from '../src/modules/rooms/entities/room-type.entity';
import { createRoomsPaymentsE2eApp } from './create-rooms-payments-e2e-app';
import { seedBuildingAndFloor } from './e2e-seed';

describe('Rooms rules (e2e)', () => {
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

  it('DELETE phòng: từ chối khi còn người (currentOccupancy > 0)', async () => {
    const ds = app.get(DataSource);
    const room = await ds.getRepository(Room).save(
      ds.getRepository(Room).create({
        floorId,
        roomNumber: 'R-DEL-OCC',
        roomType: 4,
        gender: 'Mixed',
        capacity: 4,
        currentOccupancy: 1,
        status: 'FULL',
      }),
    );

    await request(app.getHttpServer())
      .delete(`/rooms/${room.id}`)
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toContain('Không thể xóa phòng');
      });
  });

  it('PATCH status MAINTENANCE: từ chối khi còn người', async () => {
    const ds = app.get(DataSource);
    const room = await ds.getRepository(Room).save(
      ds.getRepository(Room).create({
        floorId,
        roomNumber: 'R-MNT-OCC',
        roomType: 4,
        gender: 'Mixed',
        capacity: 4,
        currentOccupancy: 2,
        status: 'FULL',
      }),
    );

    await request(app.getHttpServer())
      .patch(`/rooms/${room.id}/status`)
      .send({ status: 'MAINTENANCE' })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toContain('bảo trì');
      });
  });

  it('DELETE phòng trống: soft-delete thành công; GET sau đó 404', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/rooms')
      .send({
        floorId,
        roomNumber: 'R-EMPTY-1',
        roomType: 4,
        gender: 'Mixed',
        capacity: 4,
      })
      .expect(201);

    const id = createRes.body.id as string;

    await request(app.getHttpServer()).delete(`/rooms/${id}`).expect(200).expect({ success: true });

    await request(app.getHttpServer()).get(`/rooms/${id}`).expect(404);
  });

  it('PATCH status MAINTENANCE: cho phép khi phòng trống', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/rooms')
      .send({
        floorId,
        roomNumber: 'R-MNT-OK',
        roomType: 4,
        gender: 'Mixed',
        capacity: 4,
      })
      .expect(201);

    const id = createRes.body.id as string;

    await request(app.getHttpServer())
      .patch(`/rooms/${id}/status`)
      .send({ status: 'MAINTENANCE' })
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('MAINTENANCE');
      });
  });
});
