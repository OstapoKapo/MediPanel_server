import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateUserDto } from 'src/dto/create-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcryptjs'
import { LoggerService } from 'src/logger/logger.service';

@Injectable()
export class UserService {
   constructor(
    private prisma: PrismaService,
    private readonly logger: LoggerService, // Assuming you have a LoggerService for logging
   ) {}

   async createUser(dto: CreateUserDto): Promise<string> {

    try{
      const existingUser = await this.prisma.user.findUnique({
        where: {email: dto.email}
      })
      if(existingUser){
        this.logger.error(`User with email ${dto.email} already exists`);
        throw new BadRequestException('User with this email already exists');
      }

      const hashedPassword = await bcrypt.hash(dto.password+process.env.USER_PEPER, 10);    // create AWS Token after producrtion

      await this.prisma.user.create({
        data: {
          password: hashedPassword,
          role: dto.role,
          email: dto.email,
          createdat: new Date(),
        },
      });

      this.logger.log(`User created successfully --${dto.email}`);
      return 'User created successfully';
      }catch(error){
        this.logger.error(`Error creating user with email: ${dto.email}`, error);
        if(error instanceof BadRequestException){
          throw error;
        }
        throw new InternalServerErrorException('An error occurred while creating user');
      }
   }

   async findUserById(id: number): Promise<{email: string, id: number, role: string | null}> {

    try{
      const user = await this.prisma.user.findUnique({
        where: {id: id}
      })

      if(!user){
        this.logger.error(`User with id ${id} not found`);
        throw new BadRequestException('User not found');
      }

      this.logger.log(`User found successfully --${id}`);

      return user;
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
}
