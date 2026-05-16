import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
  Get,
  Param,
  Patch,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DormRegistrationsService } from './dorm-registrations.service';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessActor } from '../staffs/scope.service';
import { buildSafeFilename, assertFileMagic } from '../../common/helpers/safe-upload';

const uploadDir = './uploads/priority';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const PRIORITY_ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.pdf'];
const PRIORITY_ALLOWED_MIMES = ['image/jpeg', 'image/png', 'application/pdf'];

@ApiTags('dorm-registrations')
@Controller('dorm-registrations')
export class DormRegistrationsController {
  constructor(private readonly dormRegistrationsService: DormRegistrationsService) {}

  private actor(req: { user?: { accountId?: number; role?: string } }): AccessActor {
    return { accountId: Number(req.user?.accountId), role: String(req.user?.role ?? '') };
  }

  @Get('pending')
  @ApiBearerAuth()
  @Roles('staff', 'admin')
  getPendingRegistrations() {
    return this.dormRegistrationsService.getPendingRegistrations();
  }

  @Get(':id/suggested-rooms')
  @ApiBearerAuth()
  @Roles('staff', 'admin')
  getSuggestedRooms(@Param('id') id: string, @Req() req: any) {
    return this.dormRegistrationsService.getSuggestedRooms(id, this.actor(req));
  }

  @Get(':id')
  @ApiBearerAuth()
  @Roles('staff', 'admin')
  getRegistrationDetails(@Param('id') id: string) {
    return this.dormRegistrationsService.getRegistrationDetails(id);
  }

  @Patch(':id/approve')
  @ApiBearerAuth()
  @Roles('staff', 'admin')
  approveRegistration(@Param('id') id: string, @Req() req: any) {
    const accountId = req.user?.accountId;
    if (!accountId) throw new UnauthorizedException();
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
    return this.dormRegistrationsService.approveRegistration(id, accountId, ip);
  }

  @Public()
  @Post('public/apply')
  @UseInterceptors(
    FileInterceptor('priority_proof', {
      storage: diskStorage({
        destination: uploadDir,
        filename: (req, file, cb) => {
          try {
            const { safeBase, safeExt } = buildSafeFilename(file.originalname, PRIORITY_ALLOWED_EXTS);
            cb(null, `${safeBase}${safeExt}`);
          } catch (err) {
            cb(err as Error, '');
          }
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async applyDormRegistration(
    @Body('application_data') applicationDataString: string,
    @Body('student_code') studentCode: string,
    @Body('room_type') roomType: string,
    @Body('semester') semester: string,
    @Body('priority_type') priorityType: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      await assertFileMagic(path.join(uploadDir, file.filename), PRIORITY_ALLOWED_MIMES);
    }

    let applicationData;
    try {
      applicationData = JSON.parse(applicationDataString);
    } catch (e) {
      throw new BadRequestException('Invalid application_data JSON');
    }

    if (!studentCode) {
      throw new BadRequestException('Vui lòng nhập mã sinh viên hợp lệ');
    }

    if (!roomType || !semester) {
      throw new BadRequestException('Vui lòng chọn loại phòng và học kỳ');
    }

    return this.dormRegistrationsService.createPublicRegistration({
      studentCode,
      applicationData,
      roomType: parseInt(roomType, 10),
      semester,
      priorityType,
      priorityProofUrl: file ? `/uploads/priority/${file.filename}` : undefined,
    });
  }
}
