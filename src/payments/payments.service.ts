import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { Order } from '../orders/order.entity';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set in the environment');
    }
    this.stripe = new Stripe(secretKey);
  }

  async createCheckoutSession(order: Order): Promise<Stripe.Checkout.Session> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

    return this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `Tournament order ${order.id}` },
            unit_amount: Math.round(Number(order.total) * 100), // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      metadata: { orderId: order.id },
      success_url: `${frontendUrl}/orders/${order.id}?status=success`,
      cancel_url: `${frontendUrl}/orders/${order.id}?status=cancelled`,
    });
  }

  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not set in the environment');
    }
    return this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  }
}
