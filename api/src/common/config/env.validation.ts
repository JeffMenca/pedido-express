import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  APP_PROFILE: Joi.string().valid('local', 'cloud').default('local'),
  PORT: Joi.number().port().default(3000),
  LOG_LEVEL: Joi.string()
    .valid('debug', 'info', 'warn', 'error')
    .default('info'),
  CORS_ORIGINS: Joi.string().default('*'),

  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required(),
  DATABASE_SSL: Joi.boolean().when('APP_PROFILE', {
    is: 'cloud',
    then: Joi.valid(true).default(true),
    otherwise: Joi.boolean().default(false),
  }),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('8h'),

  GATEWAY_URL: Joi.string().uri().required(),
  GATEWAY_API_KEY: Joi.string().required(),
  GATEWAY_WEBHOOK_SECRET: Joi.string().required(),
  GATEWAY_TIMEOUT_MS: Joi.number().integer().min(500).default(5000),
  WEBHOOK_CALLBACK_URL: Joi.string().uri().required(),
  WEBHOOK_TOLERANCE_SECONDS: Joi.number().integer().min(1).default(300),
  RECONCILIATION_INTERVAL_MS: Joi.number().integer().min(1000).default(10000),

  BUSINESS_DATE: Joi.string().isoDate().optional(),
});
