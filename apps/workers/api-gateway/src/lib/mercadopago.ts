import type { GatewayEnv } from "../types/env";

export class MercadoPagoConfigError extends Error {
  constructor(message = "MERCADOPAGO_ACCESS_TOKEN não configurado") {
    super(message);
    this.name = "MercadoPagoConfigError";
  }
}

export interface PixPaymentInput {
  tenantId: string;
  orderId: string;
  amountCents: number;
  description: string;
  payerEmail?: string;
}

export interface PixPaymentResult {
  externalId: string;
  externalReference: string;
  qrCodeBase64: string | null;
  copyPaste: string | null;
  expiresAt: Date;
  raw: Record<string, unknown>;
}

export interface CardCheckoutInput {
  tenantId: string;
  orderId: string;
  amountCents: number;
  description: string;
  successUrl: string;
  failureUrl: string;
}

export interface CardCheckoutResult {
  externalId: string;
  externalReference: string;
  redirectUrl: string;
  expiresAt: Date;
  raw: Record<string, unknown>;
}

export function buildExternalReference(tenantId: string, orderId: string): string {
  return `${tenantId}:${orderId}`;
}

export function parseExternalReference(ref: string): { tenantId: string; orderId: string } | null {
  const parts = ref.split(":");
  if (parts.length !== 2) return null;
  const [tenantId, orderId] = parts;
  if (!tenantId || !orderId) return null;
  return { tenantId, orderId };
}

export function getPixExpirationMinutes(env: GatewayEnv): number {
  const parsed = Number.parseInt(env.PIX_EXPIRATION_MINUTES ?? "30", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
}

function mpToken(env: GatewayEnv): string {
  const token = env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) throw new MercadoPagoConfigError();
  return token;
}

type MpFetch = typeof fetch;

function getMpFetch(override?: MpFetch): MpFetch {
  return override ?? fetch;
}

/** Cria cobrança PIX via Payments API (Mercado Pago). */
export async function createPixPayment(
  env: GatewayEnv,
  input: PixPaymentInput,
  mpFetch: MpFetch = fetch,
): Promise<PixPaymentResult> {
  const token = mpToken(env);
  const minutes = getPixExpirationMinutes(env);
  const expiresAt = new Date(Date.now() + minutes * 60 * 1000);
  const externalReference = buildExternalReference(input.tenantId, input.orderId);

  const body = {
    transaction_amount: input.amountCents / 100,
    description: input.description.slice(0, 256),
    payment_method_id: "pix",
    external_reference: externalReference,
    date_of_expiration: expiresAt.toISOString(),
    payer: { email: input.payerEmail ?? "guest@inovagastro360.local" },
  };

  const res = await getMpFetch(mpFetch)("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `pix-${input.orderId}`,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    console.error("mercadopago_pix_error", res.status, data);
    throw new Error("mercadopago_pix_failed");
  }

  const poi = data.point_of_interaction as { transaction_data?: Record<string, unknown> } | undefined;
  const txData = poi?.transaction_data ?? {};

  return {
    externalId: String(data.id ?? ""),
    externalReference,
    qrCodeBase64: (txData.qr_code_base64 as string | undefined) ?? null,
    copyPaste: (txData.qr_code as string | undefined) ?? null,
    expiresAt,
    raw: data,
  };
}

/** Checkout Pro para cartão — retorna URL de redirecionamento. */
export async function createCardCheckout(
  env: GatewayEnv,
  input: CardCheckoutInput,
  mpFetch: MpFetch = fetch,
): Promise<CardCheckoutResult> {
  const token = mpToken(env);
  const minutes = getPixExpirationMinutes(env);
  const expiresAt = new Date(Date.now() + minutes * 60 * 1000);
  const externalReference = buildExternalReference(input.tenantId, input.orderId);

  const body = {
    items: [
      {
        title: input.description.slice(0, 256),
        quantity: 1,
        unit_price: input.amountCents / 100,
        currency_id: "BRL",
      },
    ],
    external_reference: externalReference,
    back_urls: {
      success: input.successUrl,
      failure: input.failureUrl,
      pending: input.successUrl,
    },
    auto_return: "approved",
    expiration_date_to: expiresAt.toISOString(),
  };

  const res = await getMpFetch(mpFetch)("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    console.error("mercadopago_card_error", res.status, data);
    throw new Error("mercadopago_card_failed");
  }

  const initPoint =
    (env.PAYMENTS_SANDBOX === "true" || env.PAYMENTS_SANDBOX === "1"
      ? (data.sandbox_init_point as string | undefined)
      : undefined) ??
    (data.init_point as string | undefined) ??
    "";

  return {
    externalId: String(data.id ?? ""),
    externalReference,
    redirectUrl: initPoint,
    expiresAt,
    raw: data,
  };
}

/** Consulta status de pagamento no MP (webhook handler). */
export async function fetchMercadoPagoPayment(
  env: GatewayEnv,
  paymentId: string,
  mpFetch: MpFetch = fetch,
): Promise<Record<string, unknown>> {
  const token = mpToken(env);
  const res = await getMpFetch(mpFetch)(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error("mercadopago_fetch_failed");
  return data;
}
