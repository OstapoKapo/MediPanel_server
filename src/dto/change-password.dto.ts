import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class ChangePasswordDto {
    @ApiProperty({ example: 'oldPassword123', description: 'The new password of the user' })
    @IsString()
    @MinLength(5, { message: 'New password must be at least 5 characters long' })
    newPassword: string;
};