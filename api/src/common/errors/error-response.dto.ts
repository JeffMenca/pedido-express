import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 'PRODUCT_UNAVAILABLE' })
  code: string;

  @ApiProperty({ example: 'Product P-009 is not available' })
  message: string;

  @ApiPropertyOptional({ example: { sku: 'P-009' } })
  details?: unknown;
}
