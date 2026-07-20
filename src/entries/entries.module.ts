import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Entry } from './entry.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Entry])],
  exports: [TypeOrmModule],
})
export class EntriesModule {}
