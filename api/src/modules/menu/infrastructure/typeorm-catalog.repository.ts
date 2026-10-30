import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CatalogRepository } from '../application/catalog.repository';
import { Catalog } from '../domain/catalog';
import {
  ComboEntity,
  CouponEntity,
  ModifierEntity,
  PricingParametersEntity,
  ProductEntity,
} from './menu.entities';

@Injectable()
export class TypeOrmCatalogRepository extends CatalogRepository {
  constructor(private readonly dataSource: DataSource) {
    super();
  }

  async load(): Promise<Catalog> {
    const [products, combos, modifiers, coupons, parameters] =
      await Promise.all([
        this.dataSource
          .getRepository(ProductEntity)
          .find({ order: { sku: 'ASC' } }),
        this.dataSource
          .getRepository(ComboEntity)
          .find({ order: { sku: 'ASC' } }),
        this.dataSource
          .getRepository(ModifierEntity)
          .find({ order: { code: 'ASC' } }),
        this.dataSource.getRepository(CouponEntity).find(),
        this.dataSource
          .getRepository(PricingParametersEntity)
          .findOneByOrFail({ id: 1 }),
      ]);
    const { id: _id, ...pricingParameters } = parameters;
    return {
      products,
      combos,
      modifiers,
      coupons,
      parameters: pricingParameters,
    };
  }
}
