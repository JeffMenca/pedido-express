import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import {
  InboxEvent,
  InboxResult,
  WebhookInbox,
} from '../application/webhook-inbox';
import { WebhookEventEntity } from './payment.entities';

@Injectable()
export class TypeOrmWebhookInbox extends WebhookInbox {
  constructor(private readonly dataSource: DataSource) {
    super();
  }

  processOnce(
    event: InboxEvent,
    handler: (manager: EntityManager) => Promise<void>,
  ): Promise<InboxResult> {
    return this.dataSource.transaction(async (manager) => {
      // A concurrent delivery of the same event blocks on the primary key until this transaction ends, then is ignored.
      const inserted = await manager
        .createQueryBuilder()
        .insert()
        .into(WebhookEventEntity)
        .values({
          eventId: event.id,
          type: event.type,
          payload: event.payload as object,
        })
        .orIgnore()
        .returning(['event_id'])
        .execute();
      if ((inserted.raw as unknown[]).length === 0) return 'DUPLICATE';
      await handler(manager);
      return 'PROCESSED';
    });
  }
}
