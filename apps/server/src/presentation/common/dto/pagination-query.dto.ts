import { IsOptional, IsInt, Min, Max, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationQueryDto {
    @ApiPropertyOptional({ minimum: 1, default: 1 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    readonly page: number = 1;

    @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 10 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    @IsOptional()
    readonly limit: number = 10;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    readonly search?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    readonly sortBy?: string;

    @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
    @IsIn(['asc', 'desc'])
    @IsOptional()
    readonly sortOrder?: 'asc' | 'desc' = 'desc';
}
