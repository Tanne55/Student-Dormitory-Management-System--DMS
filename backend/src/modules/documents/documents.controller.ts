import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../auth/roles.decorator';
import { DocumentsService } from './documents.service';
import { AccessActor } from '../staffs/scope.service';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
@Roles('staff', 'admin')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  private actor(req: { user?: { accountId?: number; role?: string } }): AccessActor {
    return { accountId: Number(req.user?.accountId), role: String(req.user?.role ?? '') };
  }

  @Get('invoices/:invoiceId/pdf')
  async invoicePdf(
    @Param('invoiceId') invoiceId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const buf = await this.documentsService.buildInvoicePdf(invoiceId, this.actor(req));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoiceId}.pdf"`);
    res.send(buf);
  }

  @Get('contracts/:contractId/checkin-receipt.pdf')
  async checkinPdf(
    @Param('contractId') contractId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const buf = await this.documentsService.buildCheckinReceiptPdf(contractId, this.actor(req));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="checkin-${contractId}.pdf"`);
    res.send(buf);
  }

  @Get('contracts/:contractId/checkout-receipt.pdf')
  async checkoutPdf(
    @Param('contractId') contractId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const buf = await this.documentsService.buildCheckoutReceiptPdf(contractId, this.actor(req));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="checkout-${contractId}.pdf"`);
    res.send(buf);
  }
}
