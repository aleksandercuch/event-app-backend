import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category) private categoriesRepo: Repository<Category>,
  ) {}

  create(tournamentId: string, dto: CreateCategoryDto) {
    const category = this.categoriesRepo.create({ ...dto, tournamentId });
    return this.categoriesRepo.save(category);
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.categoriesRepo.findOneBy({ id });
    if (!category) throw new NotFoundException('Category not found');
    Object.assign(category, dto);
    return this.categoriesRepo.save(category);
  }
}
