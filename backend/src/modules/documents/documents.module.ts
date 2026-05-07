import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Contract } from '../contracts/entities/contract.entity';
import { Student } from '../students/entities/student.entity';
import { DormRegistration } from '../dorm-registrations/entities/dorm-registration.entity';
import { Room } from '../rooms/entities/room.entity';
import { StaffsModule } from '../staffs/staffs.module';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, Contract, Student, DormRegistration, Room]), StaffsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
