import { Body, Controller, Get, Param, Post, Req, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
@Roles('staff', 'admin')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(@Body() dto: CreatePaymentDto, @Req() req: any) {
    const accountId = req.user?.accountId;
    if (!accountId) throw new UnauthorizedException();
    return this.paymentsService.createFullPayment(dto, accountId);
  }

  @Get('/invoice/:invoiceId')
  historyByInvoice(@Param('invoiceId') invoiceId: string) {
    return this.paymentsService.getByInvoice(invoiceId);
  }
}
