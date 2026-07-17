import { IsEnum, IsInt, IsString, Min } from 'class-validator';
import { Weapon } from '../category.entity';

export class CreateCategoryDto {
  @IsEnum(Weapon)
  weapon!: Weapon;

  @IsString()
  ageGroup!: string;

  @IsInt()
  @Min(1)
  capacity!: number;
}
