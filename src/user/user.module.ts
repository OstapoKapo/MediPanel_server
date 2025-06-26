import { Module } from '@nestjs/common';
import { UserResolver } from './user.resolver';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserService } from './user.service';
import { LoggerModule } from 'src/logger/logger.module';

@Module({
  exports: [UserService],
  providers: [UserResolver, UserService],
  imports: [PrismaModule, LoggerModule]
})
export class UserModule {}
