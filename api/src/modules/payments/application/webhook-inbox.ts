import { EntityManager } from 'typeorm';

export interface InboxEvent {
  id: string;
  type: string;
  payload: unknown;
}

export type InboxResult = 'PROCESSED' | 'DUPLICATE';

/** Runs a handler at most once per event id; the handler shares the transaction that records the event. */
export abstract class WebhookInbox {
  abstract processOnce(
    event: InboxEvent,
    handler: (manager: EntityManager) => Promise<void>,
  ): Promise<InboxResult>;
}
