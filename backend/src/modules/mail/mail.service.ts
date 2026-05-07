import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * SMTP scaffold (phase 1). Set in .env:
 * - MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS, MAIL_FROM
 * - MAIL_SECURE: optional, "true" / "1" for TLS (port 465)
 */
export type SendMailInput = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('MAIL_HOST')?.trim();
    const portRaw = this.config.get<string>('MAIL_PORT')?.trim();
    const user = this.config.get<string>('MAIL_USER');
    const pass = this.config.get<string>('MAIL_PASS');
    const from = this.config.get<string>('MAIL_FROM')?.trim();

    if (host && portRaw && from) {
      const port = parseInt(portRaw, 10);
      const secureRaw = this.config.get<string>('MAIL_SECURE')?.toLowerCase();
      const secure = secureRaw === 'true' || secureRaw === '1';
      this.transporter = nodemailer.createTransport({
        host,
        port: Number.isFinite(port) ? port : 587,
        secure,
        auth: user != null && pass != null ? { user, pass } : undefined,
      });
      this.logger.log('MailService: SMTP transporter initialized.');
    } else {
      this.logger.warn('MailService: MAIL_* incomplete; sendMail() will throw until configured.');
    }
  }

  isConfigured(): boolean {
    return this.transporter != null;
  }

  async sendMail(opts: SendMailInput): Promise<void> {
    if (!this.transporter) {
      throw new Error(
        'Mail is not configured. Set MAIL_HOST, MAIL_PORT, MAIL_FROM, and typically MAIL_USER / MAIL_PASS.',
      );
    }
    const from = this.config.get<string>('MAIL_FROM')!.trim();
    await this.transporter.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
  }
}
