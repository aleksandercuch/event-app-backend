import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OrdersService } from './orders.service';
import { Order, OrderStatus } from './order.entity';
import { EntryStatus } from '../entries/entry.entity';
import { Category, Weapon } from '../categories/category.entity';
import { EmailService } from '../email/email.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let categoriesRepo: { findBy: jest.Mock };
  let ordersRepo: { findOne: jest.Mock };
  let emailService: { queueOrderConfirmation: jest.Mock };
  let mockManager: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    count: jest.Mock;
  };
  let dataSource: { transaction: jest.Mock };

  const category = {
    id: 'cat-1',
    weapon: Weapon.SABRE,
    ageGroup: 'senior',
    capacity: 2,
    tournamentId: 'tourn-1',
  } as Category;

  beforeEach(async () => {
    mockManager = {
      findOne: jest.fn(),
      create: jest.fn((_entity: unknown, data: unknown) => data),
      save: jest.fn((data: unknown) => Promise.resolve(data)),
      count: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn((cb: (manager: unknown) => unknown) =>
        cb(mockManager),
      ),
    };

    categoriesRepo = { findBy: jest.fn() };
    ordersRepo = { findOne: jest.fn() };
    emailService = { queueOrderConfirmation: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: ordersRepo },
        { provide: getRepositoryToken(Category), useValue: categoriesRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = moduleRef.get(OrdersService);
  });

  describe('createFromCart', () => {
    it('creates an order and entries when the category has room', async () => {
      categoriesRepo.findBy.mockResolvedValue([category]);
      mockManager.findOne.mockResolvedValue(category); // the locked category re-fetch
      mockManager.count.mockResolvedValue(0); // no one else registered yet

      const result = await service.createFromCart('user-1', {
        categoryIds: ['cat-1'],
      });

      expect(result.total).toBe('25.00');
      expect(mockManager.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.PENDING }),
      );
    });

    it('throws NotFoundException if a categoryId does not exist', async () => {
      categoriesRepo.findBy.mockResolvedValue([]); // nothing found

      await expect(
        service.createFromCart('user-1', { categoryIds: ['does-not-exist'] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the category is already full', async () => {
      categoriesRepo.findBy.mockResolvedValue([category]);
      mockManager.findOne.mockResolvedValue(category);
      mockManager.count.mockResolvedValue(2); // capacity is 2, already 2 taken

      await expect(
        service.createFromCart('user-1', { categoryIds: ['cat-1'] }),
      ).rejects.toThrow(ConflictException);
    });

    it('allows checkout right up to capacity, but not one over', async () => {
      categoriesRepo.findBy.mockResolvedValue([category]);
      mockManager.findOne.mockResolvedValue(category);
      mockManager.count.mockResolvedValue(1); // one spot left, capacity 2

      await expect(
        service.createFromCart('user-1', { categoryIds: ['cat-1'] }),
      ).resolves.toBeDefined();
    });
  });

  describe('findOne', () => {
    it('returns the order when it belongs to the requesting user', async () => {
      ordersRepo.findOne.mockResolvedValue({ id: 'order-1', userId: 'user-1' });

      const result = await service.findOne('order-1', 'user-1');
      expect(result.id).toBe('order-1');
    });

    it('throws NotFoundException when the order does not exist', async () => {
      ordersRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when the order belongs to someone else', async () => {
      ordersRepo.findOne.mockResolvedValue({
        id: 'order-1',
        userId: 'someone-else',
      });

      await expect(service.findOne('order-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('markAsPaid', () => {
    it('flips the order and its entries to paid/confirmed, then emails the user', async () => {
      const order = {
        id: 'order-1',
        status: OrderStatus.PENDING,
        total: '25.00',
        user: { email: 'fencer@example.com', firstName: 'Marek' },
        items: [{ entry: { status: EntryStatus.PENDING } }],
      };
      mockManager.findOne.mockResolvedValue(order);

      await service.markAsPaid('order-1', 'pi_123');

      expect(order.status).toBe(OrderStatus.PAID);
      expect(order.items[0].entry.status).toBe(EntryStatus.CONFIRMED);
      expect(emailService.queueOrderConfirmation).toHaveBeenCalledWith(
        'fencer@example.com',
        'Marek',
        'order-1',
        '25.00',
      );
    });

    it('does nothing and does not email if the order is not found', async () => {
      mockManager.findOne.mockResolvedValue(null);

      await service.markAsPaid('missing-order', 'pi_123');

      expect(emailService.queueOrderConfirmation).not.toHaveBeenCalled();
    });
  });
});
