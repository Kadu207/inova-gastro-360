import { z } from "zod";

export const OrderStatusSchema = z.enum([
  "pending",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
]);

export const OrderCreatedPayloadSchema = z.object({
  orderId: z.string().uuid(),
  branchId: z.string().uuid(),
  channel: z.enum(["web", "balcao", "delivery"]),
  totalCents: z.number().int().nonnegative(),
});

export type OrderCreatedPayload = z.infer<typeof OrderCreatedPayloadSchema>;
