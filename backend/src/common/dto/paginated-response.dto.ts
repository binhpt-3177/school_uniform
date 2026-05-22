import { ApiProperty } from '@nestjs/swagger';

export class PaginationMeta {
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() total: number;
  @ApiProperty() totalPages: number;

  constructor(page: number, limit: number, total: number) {
    this.page = page;
    this.limit = limit;
    this.total = total;
    this.totalPages = Math.ceil(total / limit);
  }
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ isArray: true })
  items: T[];

  @ApiProperty({ type: () => PaginationMeta })
  meta: PaginationMeta;

  constructor(items: T[], page: number, limit: number, total: number) {
    this.items = items;
    this.meta = new PaginationMeta(page, limit, total);
  }
}
