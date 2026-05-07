import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { E2eRoomsPaymentsModule } from './e2e-rooms-payments.module';

export async function createRoomsPaymentsE2eApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [E2eRoomsPaymentsModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.use((req: { user?: { accountId: number; role: string } }, _res: unknown, next: () => void) => {
    req.user = { accountId: 99, role: 'admin' };
    next();
  });
  await app.init();
  return app;
}
