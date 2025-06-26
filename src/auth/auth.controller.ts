import { Body, Controller, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UserService } from 'src/user/user.service';
import { LoggerService } from 'src/logger/logger.service';
import { Response } from 'express';
import { LogInUserDto } from 'src/dto/login-user.dto';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService, 
        private readonly userService: UserService,
        private readonly logerService: LoggerService
    ) {}

    @Post('signUp')
    @HttpCode(HttpStatus.CREATED)
    async signUp(
        @Body() dto: CreateUserDto,
    ){
      this.logerService.log(`Get signUp request with email: ${dto.email}`);
      await this.userService.createUser(dto);  
      this.logerService.log(`User created successfully with email: ${dto.email}`);   
      return {message: 'ok'}  
    }

    @Post('logIn')
    @HttpCode(HttpStatus.OK)
    async logIn(
        @Body() dto: LogInUserDto,
        @Res({ passthrough: true }) res: Response 
    ){
        this.logerService.log(`Get logIn request with email: ${dto.email}`);
        const user = await this.authService.loginUser(dto);

        const token = await this.authService.generateToken(user);
        res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 2 * 60 * 60 * 1000, // 2h
        });

        this.logerService.log(`User has been signIn successfully with email: ${dto.email}`);   

        return {message: 'ok'}
    }
}
