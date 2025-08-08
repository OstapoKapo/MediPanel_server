import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { LoggerService } from 'src/logger/logger.service';
import { LogInUserDto } from 'src/common/dto/login-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { RedisService } from 'src/redis/redis.service';
import { Response } from 'express';
import {v4 as uuidv4} from 'uuid';
import { randomUUID } from 'crypto';
import { RecaptchaService } from 'src/recaptcha/recaptcha.service';
import { UserService } from 'src/user/user.service';


@Injectable()
export class AuthService {
    constructor(
        private readonly redisService: RedisService, 
        private readonly prisma: PrismaService,
        private readonly loggerService: LoggerService,
        private readonly recaptchaService: RecaptchaService,
        private readonly userService: UserService,
    ){}

   

    async validateUser(dto: LogInUserDto, ip: string, ua: string){
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
                await this.incrementLoginAttempts(dto.email);
                this.loggerService.error(`Invalid password for user with email: ${dto.email}`);
                throw new UnauthorizedException(`Some of the fields are incorrect`);
            };

            this.loggerService.log(`User has been logged in successfully with email: ${dto.email}`);

            if(user.isVerified){
                this.validateUserIPAndUA(user.ip, user.ua, user.id, ip, ua);
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

    private async incrementLoginAttempts(email: string){
        await this.redisService.multi()
            .incr(`loginAttempts:${email}`)
            .expire(`loginAttempts:${email}`, 900) 
            .exec();
        this.loggerService.error(`Invalid password for user with email: ${email}`);
    }

    private async validateUserIPAndUA(userIP: string, userUA: string, userID: number, currentIP: string, currentUA: string) {
        if(this.normalizeIp(userIP) !== this.normalizeIp(currentIP) ){
            await this.prisma.securityLog.create({
                data: {
                    personID: userID,
                    eventType: 'ip_mismatch',
                    ipAddress: currentIP,
                    userAgent: currentUA,
                    description: 'IP does not match expected',
                    isResolved: false,
                }
            });
        }
        if(userUA !== currentUA){
            await this.prisma.securityLog.create({
                data: {
                    personID: userID,
                    eventType: 'userAgent_mismatch',
                    ipAddress: currentIP,
                    userAgent: currentUA,
                    description: 'User Agent does not match expected',
                    isResolved: false,
                 }
            });                
        }
    }

    private normalizeIp(ip: string | undefined): string{
        if(!ip) return '';
        if(ip.includes('::ffff:')) ip = ip.split('::ffff:')[1];
        const parts = ip.split('.');
        return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : ip;
    }

     async handleLogin(
        dto: LogInUserDto,
        opts: { ip: string, ua: string, res: Response}
    ): Promise<{isVerified: boolean}> {
        
        const sessionId = randomUUID();
        const userAttempts = await this.redisService.get(`loginAttempts:${dto.email}`);

        await this.validateUserAttempts(userAttempts, dto.email, dto.recaptchaToken);

        const user = await this.validateUser(dto, opts.ip, opts.ua);
        
        if(!user.isVerified){
            await this.setUnverifiedUser(user.id, opts.res, dto.email);
            return { isVerified: false };
        }
        
        await this.createSession(user.id, sessionId, user.role, opts.ip, opts.ua, opts.res);
        await this.redisService.del(`loginAttempts:${dto.email}`);

        this.loggerService.log(`User logged in successfully with email: ${dto.email}`);

        return {isVerified: true};
    }

    private async createSession(userId: number, sessionId: string, userRole: string | null, ip: string | undefined, userAgent: string, res: Response) {
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



    private async validateUserAttempts(userAttempts: unknown, email: string, recaptchaToken: string | null) {
        const maxCancelledAttempts = 5;
        const maxCaptchaAttempts = 3;
        
         if(userAttempts && +userAttempts >= maxCaptchaAttempts && +userAttempts < maxCancelledAttempts) {
            if(!recaptchaToken){
                throw new UnauthorizedException('Recaptcha token is required');
            }

            const isValid = await this.recaptchaService.verifyToken(recaptchaToken);
            if(!isValid) {
                this.loggerService.error(`Invalid recaptcha token for email: ${email}`);
                throw new UnauthorizedException('Invalid recaptcha token');
            }
        }

        if(userAttempts){
            if(+userAttempts >= maxCancelledAttempts){
                await this.redisService.del(`loginAttempts:${email}`);
                await this.redisService.setBannedUser(email);
                this.loggerService.error(`Too many login attempts for email: ${email}`);
                throw new ForbiddenException('Too many login attempts');
            }
        }else{
            await this.redisService.setLoginAttempts(email, 0);
        } 
    }

    private async setUnverifiedUser(userId: number, res: Response, email: string){
        const verifyToken = randomUUID();
        await this.redisService.setVerifyToken(verifyToken, userId); 
        res.cookie('verifyToken', verifyToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 30 * 60 * 1000, // 30 minutes
        });
        await this.redisService.del(`loginAttempts:${email}`);
    }

    async handleLogOut(sessionID: string, res: Response){
        if(sessionID) {
            await this.redisService.del(`session:${sessionID}`);
        }

        res.clearCookie('sessionId', {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
        });

        res.clearCookie('csrfToken', {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
        });

        this.loggerService.log(`User logged out successfully`);
    }

    async handleVerifyPassword(verifyToken: string, ip: string, ua: string, newPassword: string, res: Response, sessionId: string){
        const data = await this.redisService.get<{value: number}>(`verifyToken:${verifyToken}`);
        if(!data) throw new UnauthorizedException('Verify token is invalid or expired');
        await this.userService.changeIsVerified(data.value);
        await this.userService.changeIPAndUA(data.value, ip, ua);
        const user = await this.userService.changePassword(newPassword, data.value);

        await this.redisService.del(`verifyToken:${verifyToken}`);
        res.clearCookie('verifyToken', {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
        });

        await this.createSession(user.id, sessionId, user.role, ip, ua, res);
    }
};
