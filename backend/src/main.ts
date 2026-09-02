import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV') ?? 'development';
  const isProduction = nodeEnv === 'production';

  app.use(helmet());

  // 프로덕션에서는 허용할 프론트엔드 도메인을 CORS_ORIGIN(쉼표로 구분)으로
  // 명시적으로 지정해야 한다 — 미설정 시 전체 오픈 대신 부팅을 실패시킨다.
  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  if (isProduction && !corsOrigin) {
    throw new Error(
      '[ENV] 프로덕션 환경에서는 CORS_ORIGIN 환경 변수(허용할 프론트엔드 도메인, 쉼표로 다중 지정 가능)가 반드시 설정되어야 합니다.',
    );
  }
  app.enableCors({
    origin: corsOrigin
      ? corsOrigin.split(',').map((origin) => origin.trim())
      : ['http://localhost:3000', 'http://localhost:3001'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger 문서는 API 전체 스펙을 인증 없이 노출하므로 프로덕션에서는 비활성화한다.
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('ClassHelper API')
      .setDescription('ClassHelper 학원 통합 관리 플랫폼 백엔드 API 명세서')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);
  }

  const port = configService.get<string>('PORT') ?? 3000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  if (!isProduction) {
    console.log(
      `📚 Swagger Docs available at: http://localhost:${port}/api-docs`,
    );
  }
}
bootstrap();
