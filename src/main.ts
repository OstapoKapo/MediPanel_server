import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';
import { RedisService } from './redis/redis.service';
import { HttpExceptionFilter } from './common/filter/HttpException.filter';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({
    origin: 'http://localhost:3000', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', 
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    credentials: true, 
  });
  const config = new DocumentBuilder()
    .setTitle('Users API')
    .setDescription('API for creating users')
    .setVersion('1.0')
    .build();
  
  app.use(CorrelationIdMiddleware);  
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(new ValidationPipe());
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  await app.listen(process.env.PORT ?? 8000);
}
bootstrap();
