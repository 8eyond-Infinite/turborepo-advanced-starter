import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'user' })
  @IsString()
  @MinLength(3)
  username!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  avatar?: string | null;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  roles!: string[];
}
