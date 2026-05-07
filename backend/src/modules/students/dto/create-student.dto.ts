import { IsString, IsNotEmpty, IsOptional, IsEmail, IsDateString, IsArray, ValidateNested, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { PriorityGroup } from '../entities/student-profile.entity';

export class EmergencyContactDto {
  @IsString() @IsNotEmpty()
  fullName: string;

  @IsString() @IsNotEmpty()
  relationship: string;

  @IsString() @IsNotEmpty()
  phone: string;

  @IsString() @IsNotEmpty()
  address: string;

  @IsOptional() @IsBoolean()
  isPrimary?: boolean;
}

export class StudentProfileDto {
  @IsString() @IsNotEmpty()
  idCardNumber: string;

  @IsDateString() @IsNotEmpty()
  idCardIssuedDate: Date;

  @IsString() @IsNotEmpty()
  nation: string;

  @IsString() @IsNotEmpty()
  birthPlace: string;

  @IsString() @IsNotEmpty()
  ethnicity: string;

  @IsString() @IsNotEmpty()
  religion: string;

  @IsString() @IsNotEmpty()
  province: string;

  @IsString() @IsNotEmpty()
  district: string;

  @IsString() @IsNotEmpty()
  ward: string;

  @IsString() @IsNotEmpty()
  addressDetail: string;

  @IsOptional() @IsEnum(PriorityGroup)
  priorityGroup?: PriorityGroup;
}

export class CreateStudentDto {
  @IsString() @IsNotEmpty()
  studentCode: string;

  @IsString() @IsNotEmpty()
  fullName: string;

  @IsDateString() @IsNotEmpty()
  dob: Date;

  @IsString() @IsNotEmpty()
  gender: string;

  @IsString() @IsNotEmpty()
  phone: string;

  @IsEmail() @IsNotEmpty()
  emailPersonal: string;

  @IsOptional() @IsEmail()
  emailSchool?: string;

  @IsOptional() @IsString()
  cohort?: string;

  @IsOptional() @IsString()
  faculty?: string;

  @IsOptional() @IsString()
  major?: string;

  @IsOptional() @IsString()
  className?: string;

  @ValidateNested()
  @Type(() => StudentProfileDto)
  profile: StudentProfileDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmergencyContactDto)
  contacts: EmergencyContactDto[];
}
