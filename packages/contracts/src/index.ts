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
  PRINT_JOB_REQUESTED: "print.job_requested",
} as const;

export * from "./events/order";
