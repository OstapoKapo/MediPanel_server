import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { LoggerService } from 'src/logger/logger.service';
import { LogInUserDto } from 'src/dto/login-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { RedisService } from 'src/redis/redis.service';
import { Response } from 'express';


@Injectable()
export class AuthService {
    constructor(
        private readonly redisService: RedisService, // Assuming you have a RedisService for session management
        private prisma: PrismaService,
        private readonly logger: LoggerService,
    ){}

   

    async loginUser(dto: LogInUserDto){

        try{
            const user = await this.prisma.user.findUnique({
                where: {email: dto.email.toLowerCase()}
            });
            if(!user){
                this.logger.error(`User with email ${dto.email} not found`);
                throw new BadRequestException(`Some of the fields are incorrect`);
            };

            const isPasswordValid = await bcrypt.compare(dto.password + process.env.USER_PEPER, user.password);
            if(!isPasswordValid){
                this.logger.error(`Invalid password for user with email: ${dto.email}`);
                throw new BadRequestException(`Some of the fields are incorrect`);
            };

            this.logger.log(`User has been logged in successfully with email: ${dto.email}`);

            return user;
        }catch(error) {
            this.logger.error(`Error logging in user with email: ${dto.email}`, error);
            if(error instanceof BadRequestException) {
                throw error; 
            };
            throw new InternalServerErrorException('An error occurred while logging in');
        };
    };

    async createSession(userId: number, sessionId: string, userRole: string | null, ip: string | undefined, userAgent: string, res: Response) {
        try{
            
            await this.redisService.set(`session:${sessionId}`, {
                userId: userId,
                userRole: userRole,
                ip: ip,
                userAgent: userAgent
            }, 3600);
        
            res.cookie('sessionId', sessionId, {
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
                maxAge: 3600 * 1000, // 1 hour
            })

            this.logger.log(`Session created successfully for user with id: ${userId}`);
        }catch(error) {
            this.logger.error(`Error creating session for user with id: ${userId}`, error);
            if(error instanceof BadRequestException) {
                throw error; 
            };
            throw new InternalServerErrorException('An error occurred while creating session');
        }
    }
};
