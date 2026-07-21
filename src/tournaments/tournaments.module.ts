import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tournament } from './tournament.entity';
import { TournamentsService } from './tournaments.service';
import { TournamentsController } from './tournaments.controller';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [TypeOrmModule.forFeature([Tournament]), CategoriesModule],
  providers: [TournamentsService],
  controllers: [TournamentsController],
})
export class TournamentsModule {}
