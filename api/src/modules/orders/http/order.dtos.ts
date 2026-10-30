import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  CHANNELS,
  Channel,
  ItemType,
} from '../../pricing/domain/pricing-engine';
import { ORDER_STATUSES, OrderStatus } from '../domain/order-state-machine';
import { PaymentMethod } from '../infrastructure/order.entities';

export class CartItemDto {
  @ApiProperty({ enum: ['PRODUCT', 'COMBO'] })
  @IsIn(['PRODUCT', 'COMBO'])
  type: ItemType;
  @ApiProperty({ example: 'C-001' }) @IsString() @IsNotEmpty() sku: string;
  @ApiProperty({ example: 2, minimum: 1, maximum: 20 })
  @IsInt()
  quantity: number;
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  upgradeLarge?: boolean;
  @ApiPropertyOptional({ example: ['M-01'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modifiers?: string[];
}

export class DeliveryDto {
  @ApiProperty({ example: '5a avenida 10-20 zona 1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  address: string;
  @ApiProperty({ example: '55551234' }) @Matches(/^\+?\d{8,15}$/) phone: string;
}

export class CartDto {
  @ApiProperty({ enum: CHANNELS }) @IsIn(CHANNELS) channel: Channel;
  @ApiProperty({ type: [CartItemDto] })
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];
  @ApiPropertyOptional({ example: 'COMBO15' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  couponCode?: string;
  @ApiPropertyOptional({ type: DeliveryDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryDto)
  delivery?: DeliveryDto;
}

export class CreateOrderDto extends CartDto {
  @ApiProperty({ enum: ['TARJETA', 'EFECTIVO'] })
  @IsIn(['TARJETA', 'EFECTIVO'])
  paymentMethod: PaymentMethod;
}

export class UpdateStatusDto {
  @ApiProperty({ enum: ['EN_PREPARACION', 'LISTA', 'ENTREGADA'] })
  @IsIn(ORDER_STATUSES)
  status: OrderStatus;
}

export class CancelOrderDto {
  @ApiProperty({ example: 'Cliente se retiró' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  reason: string;
}
