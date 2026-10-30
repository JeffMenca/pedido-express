import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  AuditAction,
  AuditLogEntity,
} from '../infrastructure/audit-log.entity';

export interface AuditActor {
  id: string;
  username: string;
  role: string;
}

export interface AuditEntry {
  action: AuditAction;
  orderId: string;
  actor: AuditActor;
  reason?: string | null;
  data?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  /** Runs inside the caller's transaction so the audit row commits or rolls back with the business change. */
  record(manager: EntityManager, entry: AuditEntry): Promise<AuditLogEntity> {
    return manager.getRepository(AuditLogEntity).save({
      action: entry.action,
      orderId: entry.orderId,
      actorId: entry.actor.id,
      actorUsername: entry.actor.username,
      actorRole: entry.actor.role,
      reason: entry.reason ?? null,
      data: entry.data ?? null,
    });
  }
}
