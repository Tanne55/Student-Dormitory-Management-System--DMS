import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from './entities/student.entity';
import { CreateStudentDto } from './dto/create-student.dto';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentsRepo: Repository<Student>,
  ) {}

  async createOrUpdate(accountId: number, dto: CreateStudentDto): Promise<Student> {
    let student = await this.studentsRepo.findOne({
      where: { accountId },
      relations: ['profile', 'contacts']
    });

    if (!student) {
      student = this.studentsRepo.create({ accountId });
    }

    student.studentCode = dto.studentCode;
    student.fullName = dto.fullName;
    student.dob = dto.dob;
    student.gender = dto.gender;
    student.phone = dto.phone;
    student.emailPersonal = dto.emailPersonal;
    student.emailSchool = dto.emailSchool || '';
    student.cohort = dto.cohort || '';
    student.faculty = dto.faculty || '';
    student.major = dto.major || '';
    student.className = dto.className || '';

    student.profile = dto.profile as any;
    student.contacts = dto.contacts as any;

    return await this.studentsRepo.save(student);
  }

  async getMyProfile(accountId: number): Promise<Student> {
    const student = await this.studentsRepo.findOne({
      where: { accountId },
      relations: ['profile', 'contacts']
    });
    if (!student) {
      throw new NotFoundException('Student profile not found');
    }
    return student;
  }
}
