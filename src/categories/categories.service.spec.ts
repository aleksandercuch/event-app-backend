import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Category, Weapon } from './category.entity';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let categoriesRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findOneBy: jest.Mock;
  };

  beforeEach(async () => {
    categoriesRepo = {
      create: jest.fn((data: unknown) => data),
      save: jest.fn((data: unknown) => Promise.resolve(data)),
      findOneBy: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getRepositoryToken(Category), useValue: categoriesRepo },
      ],
    }).compile();

    service = moduleRef.get(CategoriesService);
  });

  describe('create', () => {
    it('creates a category linked to the given tournament', async () => {
      const result = await service.create('tourn-1', {
        weapon: Weapon.SABRE,
        ageGroup: 'senior',
        capacity: 24,
      });

      expect(categoriesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tournamentId: 'tourn-1',
          weapon: Weapon.SABRE,
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({ tournamentId: 'tourn-1', capacity: 24 }),
      );
    });
  });

  describe('update', () => {
    it('updates fields on an existing category', async () => {
      categoriesRepo.findOneBy.mockResolvedValue({
        id: 'cat-1',
        weapon: Weapon.SABRE,
        ageGroup: 'senior',
        capacity: 24,
        tournamentId: 'tourn-1',
      });

      const result = await service.update('cat-1', { capacity: 40 });

      expect(result.capacity).toBe(40);
      expect(categoriesRepo.save).toHaveBeenCalled();
    });

    it('throws NotFoundException when the category does not exist', async () => {
      categoriesRepo.findOneBy.mockResolvedValue(null);

      await expect(service.update('missing', { capacity: 40 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
