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

   

    async loginUser(dto: LogInUserDto, ip: string, ua: string){
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

            if(user.isVerified){
                if(this.normalizeIp(user.ip) !== this.normalizeIp(ip) ){
                    this.prisma.securityLog.create({
                        data: {
                            personID: user.id,
                            eventType: 'ip_mismatch',
                            ipAddress: ip,
                            userAgent: ua,
                            description: 'IP does not match expected',
                            isResolved: false,
                        }
                    })
                }
                if(user.ua !== ua){
                    this.loggerService.error(`IP or User Agent mismatch for user with email: ${dto.email}`);
                }
            }

            return user;
        }catch(error) {
            this.loggerService.error(`Error logging in user with email: ${dto.email}`, error);
            if(error instanceof UnauthorizedException) {
                throw error; 
            };
            throw new InternalServerErrorException('An error occurred while logging in');
        };
    };

    normalizeIp(ip: string | undefined): string{
        if(!ip) return '';
        if(ip.includes('::ffff:')) ip = ip.split('::ffff:')[1];
        const parts = ip.split('.');
        return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : ip;
    }

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
