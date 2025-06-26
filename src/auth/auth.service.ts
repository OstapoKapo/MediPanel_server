import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { LoggerService } from 'src/logger/logger.service';
import { JwtService } from '@nestjs/jwt';
import { LogInUserDto } from 'src/dto/login-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';


@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private readonly logger: LoggerService,
        private readonly jwtService: JwtService,
    ){}

    async generateToken(user: {id: number, email: string, role: string | null}): Promise<string> {
      this.logger.log(`Generating token for user with email: ${user.email}`);  
      try{
        const payload = {
            sub: user.id, 
            email: user.email,
            role: user.role,
        };

        return await this.jwtService.signAsync(payload);
      }catch(error) {
        this.logger.error(`Error generating token for user with email: ${user.email}`, error);
        throw new InternalServerErrorException('An error occurred while generating token');
      };
    };

    async loginUser(dto: LogInUserDto){
        this.logger.log(`Logging in user with email: ${dto.email}`);

        try{
            const user = await this.prisma.user.findUnique({
                where: {email: dto.email}
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
};
