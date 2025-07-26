import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';
import { RedisService } from './redis/redis.service';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: 'http://localhost:3000', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', 
    allowedHeaders: 'Content-Type, Authorization', 
    credentials: true, 
  });
  const config = new DocumentBuilder()
    .setTitle('Users API')
    .setDescription('API for creating users')
    .setVersion('1.0')
    .build();
  const redisService = new RedisService();
  app.use(new CsrfMiddleware(redisService).use.bind(new CsrfMiddleware(redisService)));
  app.use(CorrelationIdMiddleware);  
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe());
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  await app.listen(process.env.PORT ?? 8000);
}
bootstrap();
