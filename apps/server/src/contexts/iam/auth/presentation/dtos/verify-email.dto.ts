import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Opaque token received in the verification email',
  })
  @IsString()
  @MinLength(32)
  token!: string;
}
