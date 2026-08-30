import { PartialType } from '@nestjs/swagger';
import { CreateClassLogDto } from './create-class-log.dto';

export class UpdateClassLogDto extends PartialType(CreateClassLogDto) {}
