import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerService } from 'src/logger/logger.service';
import { UserModule } from 'src/user/user.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RedisModule } from 'src/redis/redis.module';
import { EmailModule } from 'src/email/email.module';
import { EmailService } from 'src/email/email.service';
import { RecaptchaService } from 'src/recaptcha/recaptcha.service';


@Module({
imports: [
    PrismaModule,
    UserModule,
    RedisModule,
    EmailModule
  ],
  controllers: [AuthController],
  providers: [AuthService, LoggerService, EmailService, RecaptchaService],
  exports: [AuthService],
})
export class AuthModule{}
