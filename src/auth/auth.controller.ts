import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UserService } from 'src/user/user.service';
import { LoggerService } from 'src/logger/logger.service';
import { Response, Request } from 'express';
import { LogInUserDto } from 'src/dto/login-user.dto';
import {randomUUID} from 'crypto';
import { RedisService } from 'src/redis/redis.service';
import { SessionGuard } from 'src/guards/SessionGuard';
import { UserId } from './user-id.decorator';



@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService, 
        private readonly userService: UserService,
        private readonly logerService: LoggerService,
        private readonly redisService: RedisService
    ) {}

    @Post('signUp')
    @HttpCode(HttpStatus.CREATED)
    async signUp(
        @Body() dto: CreateUserDto,
    ){
      await this.userService.createUser(dto);  
      this.logerService.log(`User created successfully with email: ${dto.email}`);   
      return {message: 'ok'}  
    }

    @Post('logIn')
    @HttpCode(HttpStatus.OK)
    async logIn(
        @Body() dto: LogInUserDto,
        @Res({ passthrough: true }) res: Response,
        @Req() req: Request
    ){
        const user = await this.authService.loginUser(dto);
        const sessionId = randomUUID();

        const ip = req.ip;
        const userAgent = req.headers['user-agent'] || 'unknown';

        await this.redisService.set(`session:${sessionId}`, {
            userId: user.id,
            userRole: user.role,
            ip,
            userAgent
        }, 3600);
        
        res.cookie('sessionId', sessionId, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 3600 * 1000, // 1 hour
        })

        this.logerService.log(`User logged in successfully with email: ${dto.email}`);

        return {message: 'Logged In Successfully'};
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

    @Post('logOut')
    @HttpCode(HttpStatus.OK)
    async logOut(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response
    ){
        const sessionId = req.cookies.sessionId;
        if(sessionId) {
            await this.redisService.del(`session:${req.cookies.sessionId}`);
        }

        res.clearCookie('sessionId', {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
        });

        this.logerService.log(`User logged out successfully`);
        return {message: 'Logged Out Successfully'}
    }
}
