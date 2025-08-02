import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, MinLength } from "class-validator";

export class LogInUserDto {
    @ApiProperty({example: 'email@gmail.com', description: 'user email'})
    @IsEmail()
    email: string;

    @ApiProperty({example: 'ffasw3f', description: 'user password'})
    @MinLength(5, {message: 'Password must be at least 5 characters long'})
    password: string;

    @ApiProperty({example: 'captchaToken', description: 'Recaptcha token'})
    recaptchaToken: string | null;
}