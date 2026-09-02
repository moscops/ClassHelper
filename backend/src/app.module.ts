import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { StudentsModule } from './students/students.module';
import { AdminModule } from './admin/admin.module';
import { ClassesModule } from './classes/classes.module';
import { AttendanceModule } from './attendance/attendance.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ClassLogsModule } from './class-logs/class-logs.module';
import { TuitionModule } from './tuition/tuition.module';
import { CalendarModule } from './calendar/calendar.module';
import { ReportsModule } from './reports/reports.module';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          // 기본 rate limit: 60초당 IP+사용자 기준 100회 (일반 API 엔드포인트 보호용).
          // 로그인/리프레시처럼 더 엄격한 제한이 필요한 엔드포인트는 컨트롤러에서
          // @Throttle()로 개별 오버라이드한다.
          ttl: 60000,
          limit: 100,
        },
      ],
    }),
    PrismaModule,
    AuthModule,
    StudentsModule,
    AdminModule,
    ClassesModule,
    AttendanceModule,
    NotificationsModule,
    ClassLogsModule,
    TuitionModule,
    CalendarModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
