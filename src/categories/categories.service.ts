import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category) private categoriesRepo: Repository<Category>,
  ) {}

  create(tournamentId: string, dto: CreateCategoryDto) {
    const category = this.categoriesRepo.create({ ...dto, tournamentId });
    return this.categoriesRepo.save(category);
  }
}
