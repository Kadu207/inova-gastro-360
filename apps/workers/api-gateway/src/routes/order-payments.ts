import { z } from "zod";
import type { JSONValue } from "postgres";
import { jsonResponse, parseJsonBody } from "../lib";
import { getSql, withTenant, setTenantContext } from "../lib/db";
import type { GatewayEnv } from "../types/env";
import {
  createPixPayment as createAsaasPix,
  createCardCheckout as createAsaasCard,
  buildExternalReference,
  AsaasConfigError,
} from "../lib/asaas";
import {
  createPixPayment as createMpPix,
  createCardCheckout as createMpCard,
  MercadoPagoConfigError,
} from "../lib/mercadopago";
import {
  isOrderPaymentsReady,
  orderPaymentProvider,
} from "../lib/payments-config";

const PayOrderSchema = z.object({
  method: z.enum(["pix", "card"]),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

const PHONE_MIN = 8;

function guestPhoneValid(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= PHONE_MIN;
}

async function resolveBranchTenant(
  sql: ReturnType<typeof getSql>,
  branchId: string,
): Promise<{ tenantId: string } | null> {
  const [branch] = await sql<{ tenant_id: string }[]>`
    SELECT tenant_id FROM branches WHERE id = ${branchId}::uuid AND is_active = true LIMIT 1
  `;
  if (!branch) return null;
  return { tenantId: branch.tenant_id };
}

export async function handlePayOrder(
  request: Request,
  env: GatewayEnv,
  branchId: string,
  orderId: string,
): Promise<Response> {
  const parsed = PayOrderSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) {
    return jsonResponse({ error: "validation_error" }, 400);
  }
  if (!isOrderPaymentsReady(env)) {
    return jsonResponse(
      {
        error: "payments_not_configured",
        message: "Pagamento online ainda não ativado — configure ASAAS_API_KEY (ou legado MP)",
      },
      503,
    );
  }

  const provider = orderPaymentProvider(env);
  const sql = getSql(env);
  try {
    const branchCtx = await resolveBranchTenant(sql, branchId);
    if (!branchCtx) return jsonResponse({ error: "branch_not_found" }, 404);

    const { tenantId } = branchCtx;
    await setTenantContext(sql, tenantId);

    const order = await withTenant(sql, tenantId, async (tx) => {
      const [row] = await tx<
        {
          id: string;
          total_cents: number;
          payment_status: string;
          customer_phone: string | null;
          order_number: number;
        }[]
      >`
        SELECT id, total_cents, payment_status, customer_phone, order_number
        FROM orders
        WHERE id = ${orderId}::uuid AND branch_id = ${branchId}::uuid
        LIMIT 1
      `;
      return row;
    });

    if (!order) return jsonResponse({ error: "order_not_found" }, 404);
    if (order.payment_status === "paid") {
      return jsonResponse({ error: "already_paid", paymentStatus: "paid" }, 409);
    }
    if (!guestPhoneValid(order.customer_phone)) {
      return jsonResponse(
        { error: "guest_contact_required", message: "Telefone válido obrigatório antes do PIX" },
        400,
      );
    }

    const [existingIntent] = await sql<
      {
        id: string;
        status: string;
        method: string;
        amount_cents: number;
        expires_at: Date | null;
        pix_qr_code: string | null;
        pix_copy_paste: string | null;
      }[]
    >`
      SELECT id, status, method, amount_cents, expires_at, pix_qr_code, pix_copy_paste
      FROM payment_intents
      WHERE order_id = ${orderId}::uuid
        AND status IN ('created', 'pending')
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (existingIntent && existingIntent.method === parsed.data.method) {
      return jsonResponse(
        {
          paymentIntentId: existingIntent.id,
          method: existingIntent.method,
          status: "pending",
          amountCents: existingIntent.amount_cents,
          expiresAt: existingIntent.expires_at?.toISOString() ?? null,
          pix:
            existingIntent.method === "pix"
              ? {
                  qrCodeBase64: existingIntent.pix_qr_code,
                  copyPaste: existingIntent.pix_copy_paste,
                }
              : undefined,
        },
        201,
      );
    }

    const description = `Pedido #${order.order_number} — Inova Gastro 360`;
    let externalId: string;
    let externalReference: string;
    let pixQr: string | null = null;
    let pixCopy: string | null = null;
    let expiresAt: Date;
    let metadata: Record<string, unknown>;
    let redirectUrl: string | undefined;

    if (parsed.data.method === "pix") {
      const pix =
        provider === "asaas"
          ? await createAsaasPix(env, {
              tenantId,
              orderId,
              amountCents: order.total_cents,
              description,
            })
          : await createMpPix(env, {
              tenantId,
              orderId,
              amountCents: order.total_cents,
              description,
            });
      externalId = pix.externalId;
      externalReference = pix.externalReference;
      pixQr = pix.qrCodeBase64;
      pixCopy = pix.copyPaste;
      expiresAt = pix.expiresAt;
      metadata = pix.raw;
    } else {
      const origin = new URL(request.url).origin.replace(/\/$/, "");
      const cardInput = {
        tenantId,
        orderId,
        amountCents: order.total_cents,
        description,
        successUrl: parsed.data.successUrl ?? `${origin}/cardapio?paid=1`,
        failureUrl: parsed.data.cancelUrl ?? `${origin}/cardapio?paid=0`,
      };
      const card =
        provider === "asaas"
          ? await createAsaasCard(env, cardInput)
          : await createMpCard(env, cardInput);
      externalId = card.externalId;
      externalReference = card.externalReference;
      expiresAt = card.expiresAt;
      metadata = card.raw;
      redirectUrl = card.redirectUrl;
    }

    const [intent] = await withTenant(sql, tenantId, async (tx) => {
      if (existingIntent) {
        await tx`
          UPDATE payment_intents SET status = 'cancelled', updated_at = NOW()
          WHERE id = ${existingIntent.id}::uuid
        `;
      }
      await tx`
        UPDATE orders SET payment_status = 'pending', updated_at = NOW()
        WHERE id = ${orderId}::uuid
      `;
      return tx<{ id: string }[]>`
        INSERT INTO payment_intents (
          id, tenant_id, branch_id, order_id, provider, method, amount_cents,
          status, external_id, external_reference, pix_qr_code, pix_copy_paste,
          expires_at, metadata, updated_at
        ) VALUES (
          gen_random_uuid(), ${tenantId}::uuid, ${branchId}::uuid, ${orderId}::uuid,
          ${provider}, ${parsed.data.method}, ${order.total_cents}, 'pending',
          ${externalId}, ${externalReference}, ${pixQr}, ${pixCopy},
          ${expiresAt}, ${tx.json(metadata as JSONValue)}, NOW()
        )
        RETURNING id
      `;
    });

    console.info("payment_intent_created", {
      payment_intent_id: intent.id,
      order_id: orderId,
      method: parsed.data.method,
      provider,
      external_id: externalId,
    });

    return jsonResponse(
      {
        paymentIntentId: intent.id,
        method: parsed.data.method,
        status: "pending",
        amountCents: order.total_cents,
        expiresAt: expiresAt.toISOString(),
        ...(parsed.data.method === "pix"
          ? { pix: { qrCodeBase64: pixQr, copyPaste: pixCopy } }
          : { card: { redirectUrl } }),
      },
      201,
    );
  } catch (err) {
    if (err instanceof AsaasConfigError || err instanceof MercadoPagoConfigError) {
      return jsonResponse({ error: "payments_not_configured" }, 503);
    }
    if (
      err instanceof Error &&
      (err.message.includes("asaas") || err.message.includes("mercadopago"))
    ) {
      return jsonResponse({ error: "payment_provider_unavailable" }, 502);
    }
    console.error("pay_order_error", err);
    return jsonResponse({ error: "internal_error" }, 500);
  } finally {
    await sql.end();
  }
}

export async function handleGetOrderPayment(
  _request: Request,
  env: GatewayEnv,
  branchId: string,
  orderId: string,
): Promise<Response> {
  const sql = getSql(env);
  try {
    const branchCtx = await resolveBranchTenant(sql, branchId);
    if (!branchCtx) return jsonResponse({ error: "branch_not_found" }, 404);

    await setTenantContext(sql, branchCtx.tenantId);

    const [order] = await sql<
      { payment_status: string; payment_method: string | null; paid_at: Date | null }[]
    >`
      SELECT payment_status, payment_method, paid_at
      FROM orders
      WHERE id = ${orderId}::uuid AND branch_id = ${branchId}::uuid
      LIMIT 1
    `;
    if (!order) return jsonResponse({ error: "order_not_found" }, 404);

    const [intent] = await sql<
      { method: string; expires_at: Date | null }[]
    >`
      SELECT method, expires_at FROM payment_intents
      WHERE order_id = ${orderId}::uuid
      ORDER BY created_at DESC LIMIT 1
    `;

    return jsonResponse({
      paymentStatus: order.payment_status,
      method: order.payment_method ?? intent?.method ?? null,
      paidAt: order.paid_at?.toISOString() ?? null,
      expiresAt: intent?.expires_at?.toISOString() ?? null,
    });
  } finally {
    await sql.end();
  }
}

export async function handlePayInPerson(
  _request: Request,
  _env: GatewayEnv,
  _branchId: string,
  _orderId: string,
): Promise<Response> {
  return jsonResponse({ error: "not_implemented", message: "TEF/POS — spec futura (P3)" }, 501);
}

export { buildExternalReference };
