import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../common/dto/create-user.dto';
import { UserService } from 'src/user/user.service';
import { LoggerService } from 'src/logger/logger.service';
import { Response, Request } from 'express';
import { LogInUserDto } from 'src/common/dto/login-user.dto';
import {randomUUID} from 'crypto';
import { RedisService } from 'src/redis/redis.service';
import { SessionGuard } from 'src/common/guards/Session.guard';
import { UserId } from './user-id.decorator';
import { EmailService } from 'src/email/email.service';
import { ChangePasswordDto } from 'src/common/dto/change-password.dto';
import { Throttle } from '@nestjs/throttler';
import { BannedAccGuard } from 'src/common/guards/BannedAcc.guard';
import { RecaptchaService } from 'src/recaptcha/recaptcha.service';



@Controller('auth')

export class AuthController {
    constructor(
        private readonly authService: AuthService, 
        private readonly userService: UserService,
        private readonly logerService: LoggerService,
        private readonly redisService: RedisService,
        private readonly emailService: EmailService,
        private readonly recaptchaService: RecaptchaService
    ) {}

    @UseGuards(SessionGuard)
    @Post('signUp')
    @Throttle({ default: { limit: 5, ttl: 60 } }) // create custom throttler guard
    @HttpCode(HttpStatus.CREATED)
    async signUp(
        @Req() req: Request,
        @Body() dto: CreateUserDto,
    ){
      const ip = req.ip ?? 'unknown';
      const ua = req.headers['user-agent'] ?? 'unknown';
        
      const data = await this.userService.createUser(dto, ip, ua);  
      await this.emailService.sendWelcomeEmail('OstapoKapo@gmail.com', 'Welcome to MEDIPANEL!', data); // need verify domain and then we can send to another people
      this.logerService.log(`User created successfully with email: ${dto.email}`);   
      return {message: 'ok'}  
    }

    @UseGuards(BannedAccGuard)
    @Post('logIn')
    @Throttle({ default: { limit: 5, ttl: 60 } })
    @HttpCode(HttpStatus.OK)
    async logIn(
        @Body() dto: LogInUserDto,
        @Res({ passthrough: true }) res: Response,
        @Req() req: Request
    ){
        const maxCancelledAttempts = 5;
        const mixCaptchaAttempts = 3;
        const userAttempts = await this.redisService.get(`loginAttempts:${dto.email}`);


        if(userAttempts && +userAttempts >= mixCaptchaAttempts && +userAttempts < maxCancelledAttempts) {
            console.log(dto.recaptchaToken)
            if(!dto.recaptchaToken){
                throw new UnauthorizedException('Recaptcha token is required');
            }

            console.log(dto.recaptchaToken)

            const isValid = await this.recaptchaService.verifyToken(dto.recaptchaToken);
            if(!isValid) {
                this.logerService.error(`Invalid recaptcha token for email: ${dto.email}`);
                throw new UnauthorizedException('Invalid recaptcha token');
            }
        }

        await this.authService.checkUserAttempts(userAttempts, maxCancelledAttempts, dto.email);

        const user = await this.authService.loginUser(dto);
        const sessionId = randomUUID();

        if(user.isVerified === false){
           const verifyToken = randomUUID();
            await this.redisService.setVerifyToken(verifyToken, user.id); 
            res.cookie('verifyToken', verifyToken, {
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
                maxAge: 30 * 60 * 1000, // 30 minutes
            });
            await this.redisService.del(`loginAttempts:${dto.email}`);
            return { isVerified: false, message: 'User must change password' };
        }


        const ip = req.ip;
        const userAgent = req.headers['user-agent'] ?? 'unknown';

        await this.authService.createSession(user.id, sessionId, user.role, ip, userAgent, res);
        await this.redisService.del(`loginAttempts:${dto.email}`);

        this.logerService.log(`User logged in successfully with email: ${dto.email}`);

        return {message: 'Logged In Successfully', isVerified: true};
    }

    @UseGuards(SessionGuard)
    @Get('checkSession')
    @HttpCode(HttpStatus.OK)
    async checkSession(
        @UserId() userId: number
    ){
        const user = await this.userService.findUserById(userId);
        this.logerService.log(`Session checked successfully for user with id: ${userId}`);
        return {user}   
    }

    @UseGuards(SessionGuard)
    @Post('logOut')
    @HttpCode(HttpStatus.OK)
    async logOut(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response
    ){
        this.logerService.log(`User is logging out...`);
        const sessionId = req.cookies.sessionId;
        if(sessionId) {
            await this.redisService.del(`session:${req.cookies.sessionId}`);
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

        this.logerService.log(`User logged out successfully`);
        return {message: 'Logged Out Successfully'}
    }

    @Post('verifyPassword')
    @HttpCode(HttpStatus.OK)
    async verifyPassword(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
        @Body() dto: ChangePasswordDto
    ){
        const verifyToken = req.cookies.verifyToken;
        if(!verifyToken) throw new UnauthorizedException('Verify token is missing');
        
        const data = await this.redisService.get<{value: number}>(`verifyToken:${verifyToken}`);
        if(!data) throw new UnauthorizedException('Verify token is invalid or expired');
        await this.userService.changeIsVerified(data.value)
        const user = await this.userService.changePassword(dto.newPassword, data.value);

        await this.redisService.del(`verifyToken:${verifyToken}`);
        res.clearCookie('verifyToken', {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
        });

        const sessionId = randomUUID();
        const ip = req.ip;
        const userAgent = req.headers['user-agent'] || 'unknown';

        await this.authService.createSession(user.id, sessionId, user.role, ip, userAgent, res);
        return {message: 'Password changed successfully'};
    }

    @Get('checkVerifyToken')
    @HttpCode(HttpStatus.OK)
    async checkVerifyToken(
        @Req() req: Request
    ){
        const token = req.cookies.verifyToken;
        if(!token) throw new UnauthorizedException('Verify token is missing');

        const data = await this.redisService.get<{userId: number}>(`verifyToken:${token}`);
        if(!data) throw new UnauthorizedException('Verify token is invalid or expired');

        return {userId: data.userId, message: 'Verify token is valid'};
    }
}


