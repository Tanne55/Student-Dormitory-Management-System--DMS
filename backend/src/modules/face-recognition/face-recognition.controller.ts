import {
  Controller, Post, Get, Delete, Body, Param, Query, Req,
  BadRequestException, UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { FaceRecognitionService } from './face-recognition.service';
import { EnrollFaceDto } from './dto/enroll-face.dto';
import { RecognizeFaceDto } from './dto/recognize-face.dto';
import { CreateAccessLogDto } from './dto/create-access-log.dto';
import { Roles } from '../auth/roles.decorator';

@ApiTags('face-recognition')
@ApiBearerAuth()
@Controller()
export class FaceRecognitionController {
  constructor(private readonly service: FaceRecognitionService) {}

  // ==================== ENROLLMENT ====================

  @Post('face/enroll')
  @Roles('admin', 'staff')
  @ApiOperation({ summary: 'Đăng ký khuôn mặt cho sinh viên' })
  async enroll(@Body() dto: EnrollFaceDto, @Req() req: any) {
    const accountId = req.user?.accountId;
    if (!accountId) throw new UnauthorizedException();
    return this.service.enrollFace(dto, accountId);
  }

  @Delete('face/enroll/:studentCode')
  @Roles('admin')
  @ApiOperation({ summary: 'Xóa khuôn mặt đã đăng ký của sinh viên' })
  async deleteEnrollment(@Param('studentCode') studentCode: string) {
    return this.service.deleteEnrollment(studentCode);
  }

  @Get('face/enrolled')
  @Roles('admin', 'staff')
  @ApiOperation({ summary: 'Danh sách sinh viên đã đăng ký khuôn mặt' })
  async getEnrolled() {
    return this.service.getEnrolledStudents();
  }

  // ==================== RECOGNITION ====================

  @Post('face/recognize')
  @Roles('admin', 'staff')
  @ApiOperation({ summary: 'Nhận diện khuôn mặt từ descriptor' })
  async recognize(@Body() dto: RecognizeFaceDto) {
    return this.service.recognize(dto);
  }

  // ==================== ACCESS LOGS ====================

  @Post('access-logs')
  @Roles('admin', 'staff')
  @ApiOperation({ summary: 'Ghi log ra/vào ký túc xá' })
  async createLog(@Body() dto: CreateAccessLogDto) {
    return this.service.createLog(dto);
  }

  @Get('access-logs')
  @Roles('admin', 'staff')
  @ApiOperation({ summary: 'Lịch sử ra vào ký túc xá' })
  async getLogs(
    @Query('studentCode') studentCode?: string,
    @Query('buildingCode') buildingCode?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getLogs({
      studentCode,
      buildingCode,
      dateFrom,
      dateTo,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }
}
