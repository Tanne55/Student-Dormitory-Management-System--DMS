import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { AuditService } from './audit.service';

@ApiTags('audit-logs')
@ApiBearerAuth()
@Controller('audit-logs')
@Roles('admin')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  findAll(
    @Query('entityType') entityType?: string,
    @Query('actorAccountId') actorAccountId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.findAll({
      entityType,
      actorAccountId: actorAccountId ? parseInt(actorAccountId, 10) : undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
