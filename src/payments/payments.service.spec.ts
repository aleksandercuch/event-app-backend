const mockSessionsCreate = jest.fn();
const mockConstructEvent = jest.fn();

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: mockSessionsCreate } },
    webhooks: { constructEvent: mockConstructEvent },
  }));
});

import type Stripe from 'stripe';
import { PaymentsService } from './payments.service';
import { Order } from '../orders/order.entity';

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fake';
    process.env.FRONTEND_URL = 'http://localhost:3001';
    mockSessionsCreate.mockReset();
    mockConstructEvent.mockReset();
    service = new PaymentsService();
  });

  describe('createCheckoutSession', () => {
    it('converts the order total to cents and attaches the orderId as metadata', async () => {
      mockSessionsCreate.mockResolvedValue({
        id: 'cs_test_1',
        url: 'https://checkout.stripe.com/pay/cs_test_1',
      });

      const order = { id: 'order-1', total: '25.00' } as Order;
      const session = await service.createCheckoutSession(order);

      const calls = mockSessionsCreate.mock.calls as unknown as Array<
        [Stripe.Checkout.SessionCreateParams]
      >;
      const callArgs = calls[0][0];

      expect(callArgs.mode).toBe('payment');
      expect(callArgs.metadata).toEqual({ orderId: 'order-1' });

      const lineItem = callArgs.line_items?.[0];
      expect(lineItem?.price_data?.unit_amount).toBe(2500);
      expect(session.url).toBe('https://checkout.stripe.com/pay/cs_test_1');
    });
  });

  describe('constructWebhookEvent', () => {
    it('returns the verified event when the signature is valid', () => {
      const fakeEvent = { type: 'checkout.session.completed' };
      mockConstructEvent.mockReturnValue(fakeEvent);

      const result = service.constructWebhookEvent(
        Buffer.from('{}'),
        'valid-sig',
      );

      expect(result).toBe(fakeEvent);
      expect(mockConstructEvent).toHaveBeenCalledWith(
        Buffer.from('{}'),
        'valid-sig',
        'whsec_fake',
      );
    });

    it('throws when the signature does not match', () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      expect(() =>
        service.constructWebhookEvent(Buffer.from('{}'), 'forged-sig'),
      ).toThrow('Invalid signature');
    });
  });

  it('refuses to start if STRIPE_SECRET_KEY is missing', () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(() => new PaymentsService()).toThrow(
      'STRIPE_SECRET_KEY is not set in the environment',
    );
  });
});
