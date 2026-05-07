import { Controller, Get, Patch, Query, Param, Body, Req, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { AccessActor } from '../staffs/scope.service';

@ApiTags('invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  private actor(req: { user?: { accountId?: number; role?: string } }): AccessActor {
    return { accountId: Number(req.user?.accountId), role: String(req.user?.role ?? '') };
  }

  @ApiBearerAuth()
  @Roles('staff', 'admin')
  @Get('all')
  async getAllInvoices(@Req() req: any, @Query('status') status?: string, @Query('month') month?: string) {
    return this.invoicesService.findAll(this.actor(req), status, month);
  }

  @ApiBearerAuth()
  @Roles('staff', 'admin')
  @Patch(':id/mark-paid')
  async markPaid(@Param('id') id: string, @Body('studentCode') studentCode: string, @Req() req: any) {
    if (!studentCode) throw new BadRequestException('Vui lòng nhập Mã SV người thanh toán.');
    const accountId = req.user?.accountId;
    if (!accountId) throw new UnauthorizedException();
    return this.invoicesService.markAsPaid(id, studentCode, accountId, this.actor(req));
  }

  @ApiBearerAuth()
  @Roles('staff', 'admin')
  @Get(':id/payments')
  async getInvoicePayments(@Param('id') id: string, @Req() req: any) {
    return this.invoicesService.getPaymentsByInvoice(id, this.actor(req));
  }

  @ApiBearerAuth()
  @Roles('student', 'staff', 'admin')
  @Get('my-room')
  async getMyRoomInvoices(@Req() req: any) {
    const accountId = req.user?.accountId;
    if (!accountId) throw new UnauthorizedException();
    return this.invoicesService.findMyRoomInvoices(accountId);
  }
}
