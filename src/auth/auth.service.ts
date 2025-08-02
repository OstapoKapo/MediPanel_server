import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { LoggerService } from 'src/logger/logger.service';
import { LogInUserDto } from 'src/common/dto/login-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { RedisService } from 'src/redis/redis.service';
import { Response } from 'express';
import {v4 as uuidv4} from 'uuid';


@Injectable()
export class AuthService {
    constructor(
        private readonly redisService: RedisService, 
        private readonly prisma: PrismaService,
        private readonly loggerService: LoggerService,

    ){}

   

    async loginUser(dto: LogInUserDto){
        try{
            const user = await this.prisma.user.findUnique({
                where: {email: dto.email.toLowerCase()}
            });
            if(!user){
                this.loggerService.error(`User with email ${dto.email} not found`);
                throw new UnauthorizedException(`Some of the fields are incorrect`);
            };

            const isPasswordValid = await bcrypt.compare(dto.password + process.env.USER_PEPER, user.password);
            if(!isPasswordValid){
                await this.redisService.multi()
                    .incr(`loginAttempts:${dto.email}`)
                    .expire(`loginAttempts:${dto.email}`, 900) 
                    .exec();
                this.loggerService.error(`Invalid password for user with email: ${dto.email}`);
                throw new UnauthorizedException(`Some of the fields are incorrect`);
            };

            this.loggerService.log(`User has been logged in successfully with email: ${dto.email}`);

            return user;
        }catch(error) {
            this.loggerService.error(`Error logging in user with email: ${dto.email}`, error);
            if(error instanceof UnauthorizedException) {
                throw error; 
            };
            throw new InternalServerErrorException('An error occurred while logging in');
        };
    };

    async createSession(userId: number, sessionId: string, userRole: string | null, ip: string | undefined, userAgent: string, res: Response) {
        try{
            const csrfToken = uuidv4();
            
            await this.redisService.setSession(sessionId, {
                userId: userId,
                userRole: userRole,
                ip: ip,
                userAgent: userAgent,
                csrfToken
            });

            res.cookie('sessionId', sessionId, {
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
                maxAge: 3600 * 1000, // 1 hour
            });

            res.cookie('csrfToken', csrfToken, {
                httpOnly: false,
                secure: false,
                sameSite: 'lax',
                maxAge: 3600 * 1000,
            });

            this.loggerService.log(`Session created successfully for user with id: ${userId}`);
        }catch(error) {
            this.loggerService.error(`Error creating session for user with id: ${userId}`, error);
            if(error instanceof BadRequestException) {
                throw error; 
            };
            throw new InternalServerErrorException('An error occurred while creating session');
        }
    }

    async checkUserAttempts(userAttempts: unknown, maxAttempts: number, email: string) {
        if(userAttempts){
            if(+userAttempts >= maxAttempts){
                await this.redisService.del(`loginAttempts:${email}`);
                await this.redisService.setBannedUser(email);
                this.loggerService.error(`Too many login attempts for email: ${email}`);
                throw new ForbiddenException('Too many login attempts');
            }
        }else{
            await this.redisService.setLoginAttempts(email, 0);

        } 
    }
};
