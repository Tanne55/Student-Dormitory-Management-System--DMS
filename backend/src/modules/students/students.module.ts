import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { Student } from './entities/student.entity';
import { StudentProfile } from './entities/student-profile.entity';
import { EmergencyContact } from './entities/emergency-contact.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Student, StudentProfile, EmergencyContact])],
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
