import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Clock, FixedDateClock, SystemClock } from './clock/clock';

@Global()
@Module({
  providers: [
    {
      provide: Clock,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const businessDate = config.get<string>('BUSINESS_DATE');
        return businessDate
          ? new FixedDateClock(businessDate)
          : new SystemClock();
      },
    },
  ],
  exports: [Clock],
})
export class CommonModule {}
