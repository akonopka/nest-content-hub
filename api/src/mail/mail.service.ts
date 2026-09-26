import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
  });

  async send(
    to: string,
    subject: string,
    text: string,
    html: string,
  ): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.MAIL_FROM,
        to,
        subject,
        text,
        html,
      });

      console.log('Message sent: %s', info.messageId);
    } catch (err) {
      console.error('Error while sending mail:', err);
    }
  }
}
