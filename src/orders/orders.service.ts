import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order, OrderStatus } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Entry } from '../entries/entry.entity';
import { Category } from '../categories/category.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { In } from 'typeorm';
import { EntryStatus } from '../entries/entry.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private ordersRepo: Repository<Order>,
    @InjectRepository(Category) private categoriesRepo: Repository<Category>,
    private dataSource: DataSource,
    private emailService: EmailService,
  ) {}

  async createFromCart(userId: string, dto: CreateOrderDto) {
    const categories = await this.categoriesRepo.findBy({
      id: In(dto.categoryIds),
    });
    if (categories.length !== dto.categoryIds.length) {
      throw new NotFoundException('One or more categories not found');
    }

    const PRICE_PER_ENTRY = 25.0;
    const total = categories.length * PRICE_PER_ENTRY;

    return this.dataSource.transaction(async (manager) => {
      for (const category of categories) {
        const locked = await manager.findOne(Category, {
          where: { id: category.id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!locked) throw new NotFoundException('Category not found');

        const currentCount = await manager.count(Entry, {
          where: {
            categoryId: category.id,
            status: In([EntryStatus.PENDING, EntryStatus.CONFIRMED]),
          },
        });

        if (currentCount >= locked.capacity) {
          throw new ConflictException(
            `Category ${locked.weapon}/${locked.ageGroup} is full`,
          );
        }
      }

      const order = manager.create(Order, {
        userId,
        status: OrderStatus.PENDING,
        total: total.toFixed(2),
      });
      await manager.save(order);

      for (const category of categories) {
        const entry = manager.create(Entry, {
          userId,
          categoryId: category.id,
        });
        await manager.save(entry);

        const item = manager.create(OrderItem, {
          orderId: order.id,
          entryId: entry.id,
          price: PRICE_PER_ENTRY.toFixed(2),
        });
        await manager.save(item);
      }

      return order;
    });
  }

  async markAsPaid(orderId: string, paymentIntentId: string) {
    const result = await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        relations: { items: { entry: true }, user: true },
      });
      if (!order) return null;

      order.status = OrderStatus.PAID;
      order.stripePaymentIntentId = paymentIntentId;
      await manager.save(order);

      for (const item of order.items) {
        item.entry.status = EntryStatus.CONFIRMED;
        await manager.save(item.entry);
      }

      return order;
    });

    if (result) {
      await this.emailService.queueOrderConfirmation(
        result.user.email,
        result.user.firstName,
        result.id,
        result.total,
      );
    }
  }

  async findOne(id: string, userId: string) {
    const order = await this.ordersRepo.findOne({
      where: { id },
      relations: { items: { entry: { category: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId)
      throw new BadRequestException('Not your order');
    return order;
  }
}
