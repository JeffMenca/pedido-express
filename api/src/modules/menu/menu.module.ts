import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogRepository } from './application/catalog.repository';
import { MenuService } from './application/menu.service';
import { MenuController } from './http/menu.controller';
import { MENU_ENTITIES } from './infrastructure/menu.entities';
import { TypeOrmCatalogRepository } from './infrastructure/typeorm-catalog.repository';

@Module({
  imports: [TypeOrmModule.forFeature(MENU_ENTITIES)],
  controllers: [MenuController],
  providers: [
    MenuService,
    { provide: CatalogRepository, useClass: TypeOrmCatalogRepository },
  ],
  exports: [CatalogRepository],
})
export class MenuModule {}
