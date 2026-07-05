import { z } from "zod";

export const HealthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
  version: z.string(),
  timestamp: z.string().datetime(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const DomainEventSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  tenantId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  payload: z.record(z.unknown()),
  occurredAt: z.string().datetime(),
  idempotencyKey: z.string().optional(),
});

export type DomainEvent = z.infer<typeof DomainEventSchema>;

export const EVENT_TYPES = {
  ORDER_CREATED: "order.created",
  ORDER_STATUS_CHANGED: "order.status_changed",
  ORDER_PAYMENT_CONFIRMED: "order.payment_confirmed",
  ORDER_PAYMENT_EXPIRED: "order.payment_expired",
  PRINT_JOB_REQUESTED: "print.job_requested",
  /** Emitido pelo agente EMB-01 quando um pedido fica preso além do SLA */
  ORDER_STUCK: "order.stuck",
  /** Emitido pelo agente EMB-03 quando trial de assinatura expira em ≤3 dias */
  SUBSCRIPTION_TRIAL_EXPIRING: "subscription.trial_expiring",
  /** Assinatura inadimplente (past_due) — alerta operacional */
  SUBSCRIPTION_PAST_DUE: "subscription.past_due",
} as const;

export * from "./events/order";
