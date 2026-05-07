import { Controller, Post, Get, Patch, Param, UseInterceptors, UploadedFile, Body, Req, Query, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RepairRequestsService } from './repair-requests.service';
import { extname } from 'path';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { AccessActor } from '../staffs/scope.service';

const uploadDir = './uploads/repairs';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

@ApiTags('repair-requests')
@Controller('repair-requests')
export class RepairRequestsController {
  constructor(private readonly repairService: RepairRequestsService) {}

  private actor(req: { user?: { accountId?: number; role?: string } }): AccessActor {
    return { accountId: Number(req.user?.accountId), role: String(req.user?.role ?? '') };
  }

  // ==================== STAFF ENDPOINTS ====================

  @ApiBearerAuth()
  @Get('all')
  @Roles('staff', 'admin')
  async findAll(@Query('status') status?: string, @Query('category') category?: string, @Req() req?: any) {
      return this.repairService.findAll({ status, category }, this.actor(req));
  }

  @ApiBearerAuth()
  @Patch(':id/status')
  @Roles('staff', 'admin')
  async updateStatus(
      @Param('id') id: string,
      @Body('status') status: string,
      @Body('staffNote') staffNote: string,
      @Req() req: any,
  ) {
      if (!status) throw new BadRequestException('Vui lòng chọn trạng thái mới.');
      const staffId = req.user?.accountId;
      if (!staffId) throw new UnauthorizedException();
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
      return this.repairService.updateStatus(id, status, staffNote, staffId, this.actor(req), ip);
  }

  // ==================== STUDENT ENDPOINTS ====================

  @ApiBearerAuth()
  @Get('my-current-room')
  @Roles('student', 'staff')
  async getCurrentRoom(@Req() req: any) {
      const accountId = req.user?.accountId;
      if (!accountId) throw new UnauthorizedException();
      return this.repairService.getCurrentRoom(accountId);
  }

  @ApiBearerAuth()
  @Get('my-requests')
  @Roles('student', 'staff')
  async getMyRequests(@Req() req: any) {
      const accountId = req.user?.accountId;
      if (!accountId) throw new UnauthorizedException();
      return this.repairService.getMyRequests(accountId);
  }

  @ApiBearerAuth()
  @Post()
  @Roles('student', 'staff')
  @UseInterceptors(FileInterceptor('attachment_file', {
    storage: diskStorage({
      destination: uploadDir,
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + extname(file.originalname));
      }
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
         cb(null, true);
      } else {
         cb(new BadRequestException('Chỉ cho phép tải lên hình ảnh hợp lệ (jpg/png)'), false);
      }
    },
    limits: { fileSize: 5 * 1024 * 1024 }
  }))
  async createRequest(
    @Req() req: any,
    @Body('category') category: string,
    @Body('description') description: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const accountId = req.user?.accountId;
    if (!accountId) throw new UnauthorizedException();

    if (!description || description.trim() === '') {
        throw new BadRequestException('Vui lòng mô tả chi tiết hư hỏng.');
    }
    if (!category) {
        throw new BadRequestException('Vui lòng nhập đầy đủ các thông tin bắt buộc.');
    }

    return this.repairService.createRequest(accountId, {
        category,
        description,
        attachmentUrl: file ? `/uploads/repairs/${file.filename}` : undefined
    });
  }
}
