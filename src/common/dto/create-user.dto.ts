import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString } from "class-validator";

export class CreateUserDto {
  @ApiProperty({example: 'admin@gmail.com', description: 'user email'})  
  @IsEmail()
  email: string;

  @ApiProperty({example: 'admin', description: 'user role'})
  @IsString()
  role: 'admin' | 'doctor' | 'viewer'
}