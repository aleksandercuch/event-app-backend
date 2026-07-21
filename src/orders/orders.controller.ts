import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { PaymentsService } from '../payments/payments.service';

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string; role: string };
}

@Controller('orders')
@UseGuards(AuthGuard('jwt'))
export class OrdersController {
  constructor(
    private ordersService: OrdersService,
    private paymentsService: PaymentsService,
  ) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateOrderDto) {
    return this.ordersService.createFromCart(req.user.userId, dto);
  }

  @Post(':id/checkout')
  async checkout(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const order = await this.ordersService.findOne(id, req.user.userId);
    const session = await this.paymentsService.createCheckoutSession(order);
    return { checkoutUrl: session.url };
  }

  @Get(':id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.ordersService.findOne(id, req.user.userId);
  }
}
