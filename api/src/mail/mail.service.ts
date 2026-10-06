import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
  });

  private readonly logger = new Logger(MailService.name);

  async send(
    to: string,
    subject: string,
    text: string,
    html: string,
  ): Promise<boolean> {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.MAIL_FROM,
        to,
        subject,
        text,
        html,
      });

      this.logger.log('Message sent: %s', info.messageId);
      return true;
    } catch (err) {
      this.logger.error('Error while sending mail:', err);
      return false;
    }
  }
}
