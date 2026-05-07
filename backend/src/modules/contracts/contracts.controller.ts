import { Controller, Get, Query, Req } from '@nestjs/common';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Roles } from '../auth/roles.decorator';

import { ContractsService } from './contracts.service';

import { AccessActor } from '../staffs/scope.service';



@ApiTags('contracts')

@ApiBearerAuth()

@Controller('contracts')

@Roles('staff', 'admin')

export class ContractsController {

  constructor(private readonly contractsService: ContractsService) {}



  private actor(req: { user?: { accountId?: number; role?: string } }): AccessActor {

    return { accountId: Number(req.user?.accountId), role: String(req.user?.role ?? '') };

  }



  @Get()

  findAll(@Query('status') status: string | undefined, @Req() req: any) {

    return this.contractsService.findAll(status, this.actor(req));

  }

}

