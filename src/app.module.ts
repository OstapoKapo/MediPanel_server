import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { AuthModule } from './auth/auth.module';
import { UserService } from './user/user.service';
import { UserModule } from './user/user.module';
import { LoggerService } from './logger/logger.service';
import { LoggerModule } from './logger/logger.module';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis/redis.service';
import { RedisModule } from './redis/redis.module';
import { EmailModule } from './email/email.module';
import { EmailService } from './email/email.service';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { RecaptchaService } from './recaptcha/recaptcha.service';


@Module({
  imports: [
    // GraphQLModule.forRoot<ApolloDriverConfig>({
    //   driver: ApolloDriver,
    //   autoSchemaFile: true,
    //   playground: true,
    // }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60,
          limit: 5,
        },
      ],
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    UserModule,
    LoggerModule,
    RedisModule,
    EmailModule],
  controllers: [AuthController],
  providers: [AppService, AuthService, UserService, LoggerService, RedisService, EmailService, RecaptchaService],
})
export class AppModule {}
