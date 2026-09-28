import { MailService } from '../mail/mail.service';

describe('MailService', () => {
  const mailService = new MailService();
  const sendMail = jest.spyOn(mailService.transporter, 'sendMail') as jest.Mock;

  it('sends email successfully', async () => {
    sendMail.mockResolvedValue({ messageId: 'abc' });

    const result = await mailService.send(
      'to@example.com',
      'subject',
      'text',
      'html',
    );

    expect(result).toBe(true);
  });

  it('throws an error while sending an email', async () => {
    sendMail.mockRejectedValue(new Error('smtp down'));

    const result = await mailService.send(
      'to@example.com',
      'subject',
      'text',
      'html',
    );

    expect(result).toBe(false);
  });
});
