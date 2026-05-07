import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { Invoice } from './entities/invoice.entity';
import { DormRegistration } from '../dorm-registrations/entities/dorm-registration.entity';
import { Student } from '../students/entities/student.entity';
import { PaymentsModule } from '../payments/payments.module';
import { StaffsModule } from '../staffs/staffs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, DormRegistration, Student]),
    PaymentsModule,
    StaffsModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
