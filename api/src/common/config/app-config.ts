import { ConfigService } from '@nestjs/config';

export interface GatewayConfig {
  url: string;
  apiKey: string;
  webhookSecret: string;
  timeoutMs: number;
  callbackUrl: string;
  webhookToleranceSeconds: number;
}

export const gatewayConfig = (config: ConfigService): GatewayConfig => ({
  url: config.getOrThrow<string>('GATEWAY_URL'),
  apiKey: config.getOrThrow<string>('GATEWAY_API_KEY'),
  webhookSecret: config.getOrThrow<string>('GATEWAY_WEBHOOK_SECRET'),
  timeoutMs: config.getOrThrow<number>('GATEWAY_TIMEOUT_MS'),
  callbackUrl: config.getOrThrow<string>('WEBHOOK_CALLBACK_URL'),
  webhookToleranceSeconds: config.getOrThrow<number>(
    'WEBHOOK_TOLERANCE_SECONDS',
  ),
});
