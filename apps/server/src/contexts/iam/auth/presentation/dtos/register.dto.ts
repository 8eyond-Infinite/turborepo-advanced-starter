import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
    @ApiProperty({ example: 'testuser@gmail.com', description: 'The email address of the user' })
    @IsEmail({}, { message: 'Invalid email format' })
    email!: string;

    @ApiProperty({ example: 'SecurePassword123!', description: 'The password of the user' })
    @IsString()
    @MinLength(6, { message: 'Password must be at least 6 characters long' })
    password!: string;
}
