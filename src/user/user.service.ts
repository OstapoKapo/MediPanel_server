import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateUserDto } from 'src/common/dto/create-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcryptjs'
import { LoggerService } from 'src/logger/logger.service';
import {randomUUID} from 'crypto';

@Injectable()
export class UserService {
   constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService, // Assuming you have a LoggerService for logging
   ) {}

   async createUser(dto: CreateUserDto, ip: string, ua: string): Promise<string> {

    try{
      const existingUser = await this.prisma.user.findUnique({
        where: {email: dto.email.toLowerCase()}
      })
      if(existingUser){
        this.logger.error(`User with email ${dto.email} already exists`);
        throw new BadRequestException('User with this email already exists');
      }

      const password = randomUUID().slice(0, 10); 
      const hashedPassword = await bcrypt.hash(password+process.env.USER_PEPER, 10);    // create AWS Token after producrtion

      await this.prisma.user.create({
        data: {
          password: hashedPassword,
          role: dto.role,
          email: dto.email.toLowerCase(),
          createdat: new Date(),
          is2FA: false, // Default value,
          isVerified: false, // Default value
          ip: ip, 
          ua: ua
        },
      });

      this.logger.log(`User created successfully --${dto.email}`);
      return password;
      }catch(error){
        this.logger.error(`Error creating user with email: ${dto.email}`, error);
        if(error instanceof BadRequestException){
          throw error;
        }
        throw new InternalServerErrorException('An error occurred while creating user');
      }
   }

   async findUserById(id: number): Promise<{email: string, id: number, role: string | null, isVerified: boolean | null, is2FA: boolean | null}> {

    try{
      const user = await this.prisma.user.findUnique({
        where: {id: id}
      })

      if(!user){
        this.logger.error(`User with id ${id} not found`);
        throw new BadRequestException('User not found');
      }

      this.logger.log(`User found successfully --${id}`);

      return {
        email: user.email,
        id: user.id,
        role: user.role,
        isVerified: user.isVerified,
        is2FA: user.is2FA
      };
    }catch(error){
      this.logger.error(`Error finding user with id: ${id}`, error);
      if(error instanceof BadRequestException){
        throw error;
      }
      throw new InternalServerErrorException('An error occurred while finding user by id');
    }
   }

   async findUserByEmail(email: string): Promise<{email: string, id: number, role: string | null}> {

    try{
      const user = await this.prisma.user.findUnique({
        where: {email: email}
      })

      if(!user){
        this.logger.error(`User with email ${email} not found`);
        throw new BadRequestException('User not found');
      }

      this.logger.log(`User found successfully --${email}`);
    
      return user;
    }catch(error){
      this.logger.error(`Error logging in user with email: ${email}`, error);
      if(error instanceof BadRequestException){
        throw error;
      }
      throw new InternalServerErrorException('An error occurred while finding user by email');
    }
  }

  async changePassword(password: string, userId: number): Promise<{id: number, role: string | null}> {
    const hashedPassword = await bcrypt.hash(password + process.env.USER_PEPER, 10);
    try{
      const user = await this.prisma.user.update({
        where: {id: userId},
        data: {password: hashedPassword}
      });

      this.logger.log(`Password changed successfully for user with id: ${userId}`);
      return {
        id: user.id,
        role: user.role
      };
    }catch(error){
      this.logger.error(`Error changing password for user with id: ${userId}`, error);
      if(error instanceof BadRequestException){
        throw error;
      }
      throw new InternalServerErrorException('An error occurred while changing password');
    }
  }

  async changeIsVerified(userId: number): Promise<void> {
    try{
      await this.prisma.user.update({
        where: {id: userId},
        data: {isVerified: true}
      });

      this.logger.log(`User with id ${userId} is verified successfully`);
    }catch(error){
      this.logger.error(`Error verifying user with id: ${userId}`, error);
      if(error instanceof BadRequestException){
        throw error;
      }
      throw new InternalServerErrorException('An error occurred while verifying user');
    }
  }
}
