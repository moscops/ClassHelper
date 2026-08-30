import { Module } from '@nestjs/common';
import { ClassLogsService } from './class-logs.service';
import { ClassLogsController } from './class-logs.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ClassLogsController],
  providers: [ClassLogsService],
  exports: [ClassLogsService],
})
export class ClassLogsModule {}
