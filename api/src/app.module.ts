import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './common/config/env.validation';
import { DatabaseModule } from './common/database/database.module';
import { LoggerModule } from './common/logging/logger.module';
import { CommonModule } from './common/common.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { MenuModule } from './modules/menu/menu.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    LoggerModule,
    DatabaseModule,
    CommonModule,
    HealthModule,
    AuthModule,
    AuditModule,
    MenuModule,
    OrdersModule,
    PaymentsModule,
  ],
})
export class AppModule {}
