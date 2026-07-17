import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from './tournament.entity';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';

@Injectable()
export class TournamentsService {
  constructor(
    @InjectRepository(Tournament)
    private tournamentsRepo: Repository<Tournament>,
  ) {}

  findAll() {
    return this.tournamentsRepo.find({ relations: { categories: true } });
  }

  async findOne(id: string) {
    const tournament = await this.tournamentsRepo.findOne({
      where: { id },
      relations: { categories: true },
    });
    if (!tournament) throw new NotFoundException('Tournament not found');
    return tournament;
  }

  create(dto: CreateTournamentDto) {
    const tournament = this.tournamentsRepo.create(dto);
    return this.tournamentsRepo.save(tournament);
  }

  async update(id: string, dto: UpdateTournamentDto) {
    const tournament = await this.findOne(id);
    Object.assign(tournament, dto);
    return this.tournamentsRepo.save(tournament);
  }

  async remove(id: string) {
    const tournament = await this.findOne(id);
    await this.tournamentsRepo.remove(tournament);
  }
}
