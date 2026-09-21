import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceKioskController } from './attendance-kiosk.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [AttendanceController, AttendanceKioskController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
