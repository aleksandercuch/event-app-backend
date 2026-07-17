import { IsDateString, IsString, MinLength } from 'class-validator';

export class CreateTournamentDto {
  @IsString()
  @MinLength(3)
  name!: string;

  @IsDateString()
  startDate!: string;

  @IsString()
  location!: string;
}
