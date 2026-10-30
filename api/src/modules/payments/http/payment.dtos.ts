import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDefined,
  IsInt,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

export class CardDto {
  @ApiProperty({ example: '4111 1111 1111 1111' })
  @Matches(/^(\d\s?){16}$/)
  number: string;
  @ApiProperty({ example: '12/28' })
  @Matches(/^(0[1-9]|1[0-2])\/\d{2}$/)
  exp: string;
  @ApiProperty({ example: '123' }) @Matches(/^\d{3}$/) cvv: string;
}

export class CardPaymentDto {
  @ApiProperty({ type: CardDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => CardDto)
  card: CardDto;
}

export class CashPaymentDto {
  @ApiProperty({ example: 10000, description: 'Amount received in cents' })
  @IsInt()
  @Min(1)
  receivedCents: number;
}
