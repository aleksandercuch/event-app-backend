import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tournament } from '../tournaments/tournament.entity';

export enum Weapon {
  GONOW = 'gonow',
  SWORD = 'sword',
  SABRE = 'sabre',
}

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: Weapon })
  weapon!: Weapon;

  @Column()
  ageGroup!: string;

  @Column()
  capacity!: number;

  @Column()
  tournamentId!: string;

  @ManyToOne(
    () => Tournament,
    (tournament: Tournament): Category[] => tournament.categories,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'tournamentId' })
  tournament!: Tournament;
}
