import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Resend } from 'resend';
import { EmailJob } from './email.service';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private resend: Resend;
  private from: string;

  constructor() {
    super();
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not set in the environment');
    }
    this.resend = new Resend(apiKey);
    this.from = process.env.EMAIL_FROM || 'noreply@example.com';
  }

  async process(job: Job<EmailJob>): Promise<void> {
    const data = job.data;

    if (data.type === 'welcome') {
      await this.resend.emails.send({
        from: this.from,
        to: data.to,
        subject: 'Welcome to the platform',
        html: `<p>Hi ${data.firstName}, thanks for signing up! Browse open tournaments and register whenever you're ready.</p>`,
      });
      return;
    }

    if (data.type === 'order-confirmation') {
      await this.resend.emails.send({
        from: this.from,
        to: data.to,
        subject: 'Your entry is confirmed',
        html: `<p>Hi ${data.firstName}, your order <strong>${data.orderId}</strong> for $${data.total} is confirmed. Good luck!</p>`,
      });
      return;
    }
  }
}
