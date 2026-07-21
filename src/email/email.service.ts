import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

interface WelcomeEmailJob {
  type: 'welcome';
  to: string;
  firstName: string;
}

interface OrderConfirmationJob {
  type: 'order-confirmation';
  to: string;
  firstName: string;
  orderId: string;
  total: string;
}

export type EmailJob = WelcomeEmailJob | OrderConfirmationJob;

@Injectable()
export class EmailService {
  constructor(@InjectQueue('email') private emailQueue: Queue<EmailJob>) {}

  async queueWelcomeEmail(to: string, firstName: string) {
    await this.emailQueue.add('send', { type: 'welcome', to, firstName });
  }

  async queueOrderConfirmation(
    to: string,
    firstName: string,
    orderId: string,
    total: string,
  ) {
    await this.emailQueue.add('send', {
      type: 'order-confirmation',
      to,
      firstName,
      orderId,
      total,
    });
  }
}
