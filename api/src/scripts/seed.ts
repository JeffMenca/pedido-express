import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import * as bcrypt from 'bcryptjs';
import dataSource from '../common/database/data-source';
import { normalizeMenu } from '../modules/menu/domain/menu-normalizer';
import {
  ComboEntity,
  CouponEntity,
  ModifierEntity,
  PricingParametersEntity,
  ProductEntity,
} from '../modules/menu/infrastructure/menu.entities';
import { UserEntity } from '../modules/auth/infrastructure/user.entity';
import { StaffRole } from '../modules/orders/domain/order-state-machine';

const MENU_PATH =
  process.env.MENU_PATH ?? resolve(__dirname, '../../../datos/menu.json');
const REPORT_DIR = resolve(__dirname, '../../reports');
const SEED_PASSWORD = process.env.SEED_USERS_PASSWORD ?? 'PedidoExpress2026';
const SEED_USERS: { username: string; role: StaffRole }[] = [
  { username: 'cajero', role: 'CAJERO' },
  { username: 'cocina', role: 'COCINA' },
  { username: 'supervisor', role: 'SUPERVISOR' },
];

async function seed(): Promise<void> {
  const { catalog, report } = normalizeMenu(
    JSON.parse(readFileSync(MENU_PATH, 'utf8')),
  );
  await dataSource.initialize();
  await dataSource.transaction(async (manager) => {
    await manager.upsert(ProductEntity, catalog.products, ['sku']);
    await manager.upsert(ComboEntity, catalog.combos, ['sku']);
    await manager.upsert(ModifierEntity, catalog.modifiers, ['code']);
    await manager.upsert(CouponEntity, catalog.coupons, ['code']);
    await manager.upsert(
      PricingParametersEntity,
      { id: 1, ...catalog.parameters },
      ['id'],
    );
    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
    for (const user of SEED_USERS) {
      await manager.upsert(UserEntity, { ...user, passwordHash }, ['username']);
    }
  });
  await dataSource.destroy();

  mkdirSync(REPORT_DIR, { recursive: true });
  const summary = {
    generatedAt: new Date().toISOString(),
    source: 'datos/menu.json',
    loaded: {
      products: catalog.products.length,
      combos: catalog.combos.length,
      modifiers: catalog.modifiers.length,
      coupons: catalog.coupons.length,
    },
    entries: report,
  };
  writeFileSync(
    join(REPORT_DIR, 'seed-report.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  console.table(
    report.map(({ entity, key, action, reason }) => ({
      entity,
      key,
      action,
      reason,
    })),
  );
  console.log(`Seed done. Report: ${join(REPORT_DIR, 'seed-report.json')}`);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
