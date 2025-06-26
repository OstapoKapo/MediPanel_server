import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNumber, IsString, MinLength } from "class-validator";

export class CreateUserDto {
  @ApiProperty({example: 'admin@gmail.com', description: 'user email'})  
  @IsEmail()
  email: string;

  @ApiProperty({example: 'ffasw3f', description: 'user password'}) 
  @IsString()
  @MinLength(5, {message: 'Password must be at least 5 characters long'})
  password: string;

  @ApiProperty({example: 'admin', description: 'user role'})
  @IsString()
  role: 'admin' | 'superadmin' | 'viewer'
}