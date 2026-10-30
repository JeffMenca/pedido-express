import { randomUUID } from 'crypto';
import { IncomingMessage } from 'http';
import { ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

const CORRELATION_HEADER = 'x-correlation-id';

export const LoggerModule = PinoLoggerModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    pinoHttp: {
      level: config.get<string>('LOG_LEVEL'),
      genReqId: (req: IncomingMessage, res) => {
        const incoming = req.headers[CORRELATION_HEADER];
        const id =
          typeof incoming === 'string' && incoming ? incoming : randomUUID();
        res.setHeader(CORRELATION_HEADER, id);
        return id;
      },
      customAttributeKeys: { reqId: 'correlationId' },
      redact: [
        'req.headers.authorization',
        'req.body.card',
        'req.body.password',
      ],
      transport:
        config.get('NODE_ENV') === 'development'
          ? { target: 'pino-pretty', options: { singleLine: true } }
          : undefined,
    },
  }),
});
