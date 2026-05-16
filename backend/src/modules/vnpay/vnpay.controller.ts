import { Body, Controller, Get, Inject, Post, Query, Req, forwardRef } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { PaymentsService } from '../payments/payments.service';
import { CreateVnpayPaymentDto } from './dto/create-vnpay-payment.dto';

@ApiTags('vnpay')
@Controller('vnpay')
export class VnpayController {
  constructor(
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
  ) {}

  @Post('create-payment-url')
  @ApiBearerAuth()
  @Roles('student', 'staff', 'admin')
  @ApiOperation({ summary: 'Tao URL thanh toan VNPay cho mot hoa don' })
  async createPaymentUrl(@Body() dto: CreateVnpayPaymentDto, @Req() req: any) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      req.ip ||
      '127.0.0.1';

    return this.paymentsService.createVnpayPayment({
      invoiceId: dto.invoiceId,
      payerStudentCode: dto.payerStudentCode ?? null,
      ipAddress: stripIpv6Prefix(ip),
      bankCode: dto.bankCode,
    });
  }

  @Get('ipn')
  @Public()
  @ApiOperation({ summary: 'VNPay IPN callback (server-to-server). Khong goi truc tiep tu browser.' })
  async ipn(@Query() query: Record<string, string>) {
    return this.paymentsService.handleVnpayIpn(query);
  }

  @Get('return')
  @Public()
  @ApiOperation({ summary: 'Endpoint xac thuc query tu Return URL (frontend co the goi neu can).' })
  async returnVerify(@Query() query: Record<string, string>) {
    return this.paymentsService.verifyReturnUrl(query);
  }
}

function stripIpv6Prefix(ip: string): string {
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}
