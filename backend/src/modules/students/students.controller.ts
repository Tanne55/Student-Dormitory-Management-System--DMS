import { Controller, Get, Post, Body, Req, UnauthorizedException } from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { Roles } from '../auth/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('students')
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Roles('student')
  @ApiBearerAuth()
  @Post('profile')
  @ApiOperation({ summary: 'Create or Edit Student Profile' })
  async saveProfile(@Req() req: any, @Body() dto: CreateStudentDto) {
    const accountId = req.user?.accountId;
    if (!accountId) throw new UnauthorizedException();
    const result = await this.studentsService.createOrUpdate(accountId, dto);
    return {
      statusCode: 200,
      message: 'Profile saved successfully',
      data: result
    };
  }

  @ApiBearerAuth()
  @Get('profile')
  @ApiOperation({ summary: 'Get current student profile' })
  async getProfile(@Req() req: any) {
    const accountId = req.user?.accountId;
    if (!accountId) throw new UnauthorizedException();
    const result = await this.studentsService.getMyProfile(accountId);
    return {
      statusCode: 200,
      message: 'Success',
      data: result
    };
  }
}
