import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '@presentation/common/dto/pagination-query.dto';

export const USER_SORT_FIELDS = [
  'email',
  'username',
  'createdAt',
  'updatedAt',
] as const;

export type UserSortField = (typeof USER_SORT_FIELDS)[number];

export class GetUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: USER_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(USER_SORT_FIELDS)
  declare readonly sortBy?: UserSortField;
}
