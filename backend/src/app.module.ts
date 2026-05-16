import { MiddlewareConsumer, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { RolesGuard } from './modules/auth/roles.guard';
import { StudentsModule } from './modules/students/students.module';
import { LoggerMiddleware } from './common/middlewares/logger/logger.middleware';
import { RoomsModule } from './modules/rooms/rooms.module';
import { SystemModule } from './modules/system/system.module';
import { DormRegistrationsModule } from './modules/dorm-registrations/dorm-registrations.module';
import { RepairRequestsModule } from './modules/repair-requests/repair-requests.module';
import { DormExtensionsModule } from './modules/dorm-extensions/dorm-extensions.module';
import { StaffsModule } from './modules/staffs/staffs.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { CheckinsModule } from './modules/checkins/checkins.module';
import { UtilityReadingsModule } from './modules/utility-readings/utility-readings.module';
import { CheckoutsModule } from './modules/checkouts/checkouts.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { BuildingsModule } from './modules/buildings/buildings.module';
import { AuditModule } from './modules/audit/audit.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { MailModule } from './modules/mail/mail.module';
import { VnpayModule } from './modules/vnpay/vnpay.module';
import { FaceRecognitionModule } from './modules/face-recognition/face-recognition.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 60 },
      { name: 'strict', ttl: 60_000, limit: 5 },
    ]),
    DatabaseModule,
    AuthModule,
    StudentsModule,
    RoomsModule,
    BuildingsModule,
    SystemModule,
    DormRegistrationsModule,
    RepairRequestsModule,
    DormExtensionsModule,
    StaffsModule,
    ContractsModule,
    CheckinsModule,
    UtilityReadingsModule,
    CheckoutsModule,
    InvoicesModule,
    PaymentsModule,
    NotificationsModule,
    AnalyticsModule,
    AuditModule,
    DocumentsModule,
    MailModule,
    VnpayModule,
    FaceRecognitionModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('*');
  }
}
