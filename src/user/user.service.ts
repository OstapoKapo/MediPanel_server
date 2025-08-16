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

   async createUser(dto: CreateUserDto): Promise<string> {
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
          ip: 'unknown', 
          ua: 'unknown',
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

   async findUserById(id: number): Promise<{email: string, id: number, role: string | null, isVerified: boolean , is2FA: boolean, ip: string, ua: string}> {

    try{
      const user = await this.prisma.user.findUnique({
        where: {id: id}
      })

      if(!user){
        this.logger.error(`User with id ${id} not found`);
        throw new BadRequestException('User not found');
      }

      this.logger.log(`User found successfully --${id}`);

      return user
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

  async changePassword(password: string, userID: number): Promise<void>{
    try{
      const hashedPassword = await bcrypt.hash(password + process.env.USER_PEPER, 10);
      
      const user = await this.prisma.user.update({
        where: {id: userID},
        data: {password: hashedPassword}
      });
      if(!user){
        throw new BadRequestException('User not found');
      }

      this.logger.log(`Password changed successfully for user with id: ${userID}`);
    }catch(error){
      this.logger.error(`Error changing password for user with id: ${userID}`, error);
      if(error instanceof BadRequestException){
        throw error;
      }
      throw new InternalServerErrorException('An error occurred while changing password');
    }
  }

  async changeIsVerified(userID: number): Promise<void> {
    try{
      const user = await this.prisma.user.update({
        where: {id: userID},
        data: {isVerified: true}
      });
      if(!user){
        throw new BadRequestException('User not found');
      }

      this.logger.log(`User with id ${userID} is verified successfully`);
    }catch(error){
      this.logger.error(`Error verifying user with id: ${userID}`, error);
      if(error instanceof BadRequestException){
        throw error;
      }
      throw new InternalServerErrorException('An error occurred while verifying user');
    }
  }

  async changeIPAndUA(userID: number, ip: string, ua: string): Promise<void> {
    try{
      const user = await this.prisma.user.update({
        where: {id: userID},
        data: {ip: ip, ua: ua}
      });
      if(!user){
        throw new BadRequestException('User not found');
      }

      this.logger.log(`User with id ${userID} had their IP and UA updated successfully`);
    }catch(error){
      this.logger.error(`Error updating IP and UA for user with id: ${userID}`, error);
      if(error instanceof BadRequestException){
        throw error;
      }
      throw new InternalServerErrorException('An error occurred while updating user IP and UA');
    }
  }
}
