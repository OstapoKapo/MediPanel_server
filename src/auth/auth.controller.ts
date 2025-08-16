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
import { userID } from './user-id.decorator';
import { EmailService } from 'src/email/email.service';
import { ChangePasswordDto } from 'src/common/dto/change-password.dto';
import { Throttle } from '@nestjs/throttler';
import { BannedAccGuard } from 'src/common/guards/BannedAcc.guard';



@Controller('auth')

export class AuthController {
    constructor(
        private readonly authService: AuthService, 
        private readonly userService: UserService,
        private readonly logerService: LoggerService,
        private readonly redisService: RedisService,
        private readonly emailService: EmailService,
    ) {}

    @UseGuards(SessionGuard)
    @Post('signUp')
    @Throttle({ default: { limit: 5, ttl: 60 } }) // create custom throttler guard
    @HttpCode(HttpStatus.CREATED)
    async signUp(
        @Body() dto: CreateUserDto,
    ){
      const data = await this.userService.createUser(dto);  
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
        const ip = req.ip ?? 'unknown';
        const ua = req.headers['user-agent'] ?? 'unknown';

        const { isVerified } = await this.authService.handleLogin(dto, { ip, ua, res });
        
        return { message: 'Logged In Successfully', isVerified: isVerified };
    }

    @UseGuards(SessionGuard)
    @Get('checkSession')
    @HttpCode(HttpStatus.OK)
    async checkSession(
        @userID() userID: number
    ){
        const user = await this.userService.findUserById(userID);
        this.logerService.log(`Session checked successfully for user with id: ${userID}`);
        return {
            email: user.email,
            id: user.id,
            role: user.role,
            isVerified: user.isVerified,
            is2FA: user.is2FA,
            ip: user.ip,
            ua: user.ua
        };
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
        await this.authService.handleLogOut(sessionId, res);
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
        const sessionId = randomUUID();
        const ip = req.ip ?? 'unknown';
        const userAgent = req.headers['user-agent'] ?? 'unknown';
        if(!verifyToken) throw new UnauthorizedException('Verify token is missing');
        await this.authService.handleVerifyPassword(verifyToken, ip, userAgent, dto.newPassword, res, sessionId);
        return {message: 'Password changed successfully'};
    }

    @Get('checkVerifyToken')
    @HttpCode(HttpStatus.OK)
    async checkVerifyToken(
        @Req() req: Request
    ){
        const token = req.cookies.verifyToken;
        if(!token) throw new UnauthorizedException('Verify token is missing');

        const data = await this.redisService.get<{userID: number}>(`verifyToken:${token}`);
        if(!data) throw new UnauthorizedException('Verify token is invalid or expired');

        return {verifyToken: true, message: 'Verify token is valid'};
    }
}


