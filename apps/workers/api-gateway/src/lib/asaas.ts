import type { GatewayEnv } from "../types/env";

export class AsaasConfigError extends Error {
  constructor(message = "ASAAS_API_KEY não configurado") {
    super(message);
    this.name = "AsaasConfigError";
  }
}

export interface PixPaymentInput {
  tenantId: string;
  orderId: string;
  amountCents: number;
  description: string;
  payerEmail?: string;
  payerName?: string;
  payerCpfCnpj?: string;
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
  payerEmail?: string;
  payerName?: string;
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

export function asaasBaseUrl(env: GatewayEnv): string {
  const sandbox =
    env.ASAAS_SANDBOX?.trim().toLowerCase() === "true" ||
    env.ASAAS_SANDBOX === "1" ||
    env.PAYMENTS_SANDBOX?.trim().toLowerCase() === "true" ||
    env.PAYMENTS_SANDBOX === "1";
  return sandbox ? "https://sandbox.asaas.com/api/v3" : "https://api.asaas.com/api/v3";
}

function asaasKey(env: GatewayEnv): string {
  const key = env.ASAAS_API_KEY?.trim();
  if (!key) throw new AsaasConfigError();
  return key;
}

type AsaasFetch = typeof fetch;

async function asaasRequest(
  env: GatewayEnv,
  path: string,
  init: RequestInit,
  asaasFetch: AsaasFetch = fetch,
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("access_token", asaasKey(env));
  headers.set("content-type", "application/json");
  headers.set("User-Agent", "InovaGastro360/1.0");
  return asaasFetch(`${asaasBaseUrl(env)}${path}`, { ...init, headers });
}

function dueDatePlusMinutes(minutes: number): string {
  const d = new Date(Date.now() + minutes * 60_000);
  return d.toISOString().slice(0, 10);
}

async function ensureCustomer(
  env: GatewayEnv,
  input: { name?: string; email?: string; cpfCnpj?: string; externalReference: string },
  asaasFetch: AsaasFetch,
): Promise<string> {
  const body = {
    name: input.name ?? "Cliente Inova Gastro 360",
    email: input.email ?? undefined,
    cpfCnpj: input.cpfCnpj ?? undefined,
    externalReference: input.externalReference,
  };
  const res = await asaasRequest(
    env,
    "/customers",
    { method: "POST", body: JSON.stringify(body) },
    asaasFetch,
  );
  const data = (await res.json()) as { id?: string; errors?: unknown };
  if (!res.ok || !data.id) {
    throw new Error(`asaas_customer_failed:${res.status}`);
  }
  return data.id;
}

/** Cria cobrança PIX via Asaas Payments API. */
export async function createPixPayment(
  env: GatewayEnv,
  input: PixPaymentInput,
  asaasFetch: AsaasFetch = fetch,
): Promise<PixPaymentResult> {
  const externalReference = buildExternalReference(input.tenantId, input.orderId);
  const minutes = getPixExpirationMinutes(env);
  const customerId = await ensureCustomer(
    env,
    {
      name: input.payerName,
      email: input.payerEmail,
      cpfCnpj: input.payerCpfCnpj,
      externalReference,
    },
    asaasFetch,
  );

  const value = input.amountCents / 100;
  const createRes = await asaasRequest(
    env,
    "/payments",
    {
      method: "POST",
      body: JSON.stringify({
        customer: customerId,
        billingType: "PIX",
        value,
        dueDate: dueDatePlusMinutes(minutes),
        description: input.description,
        externalReference,
      }),
    },
    asaasFetch,
  );
  const payment = (await createRes.json()) as Record<string, unknown>;
  if (!createRes.ok || !payment.id) {
    throw new Error(`asaas_pix_failed:${createRes.status}`);
  }

  const paymentId = String(payment.id);
  const qrRes = await asaasRequest(env, `/payments/${paymentId}/pixQrCode`, { method: "GET" }, asaasFetch);
  const qr = (await qrRes.json()) as { encodedImage?: string; payload?: string };
  if (!qrRes.ok) {
    throw new Error(`asaas_pix_qr_failed:${qrRes.status}`);
  }

  const expiresAt = new Date(Date.now() + minutes * 60_000);
  return {
    externalId: paymentId,
    externalReference,
    qrCodeBase64: qr.encodedImage ?? null,
    copyPaste: qr.payload ?? null,
    expiresAt,
    raw: { payment, qr },
  };
}

/** Cria payment link Asaas para cartão (redirect checkout). */
export async function createCardCheckout(
  env: GatewayEnv,
  input: CardCheckoutInput,
  asaasFetch: AsaasFetch = fetch,
): Promise<CardCheckoutResult> {
  const externalReference = buildExternalReference(input.tenantId, input.orderId);
  const minutes = getPixExpirationMinutes(env);
  const customerId = await ensureCustomer(
    env,
    {
      name: input.payerName,
      email: input.payerEmail,
      externalReference,
    },
    asaasFetch,
  );

  const value = input.amountCents / 100;
  const createRes = await asaasRequest(
    env,
    "/payments",
    {
      method: "POST",
      body: JSON.stringify({
        customer: customerId,
        billingType: "CREDIT_CARD",
        value,
        dueDate: dueDatePlusMinutes(minutes),
        description: input.description,
        externalReference,
        callback: {
          successUrl: input.successUrl,
          autoRedirect: true,
        },
      }),
    },
    asaasFetch,
  );
  const payment = (await createRes.json()) as Record<string, unknown> & {
    id?: string;
    invoiceUrl?: string;
    bankSlipUrl?: string;
  };
  if (!createRes.ok || !payment.id) {
    throw new Error(`asaas_card_failed:${createRes.status}`);
  }

  const redirectUrl =
    payment.invoiceUrl ??
    `${asaasBaseUrl(env).replace("/api/v3", "")}/i/${payment.id}`;

  return {
    externalId: String(payment.id),
    externalReference,
    redirectUrl,
    expiresAt: new Date(Date.now() + minutes * 60_000),
    raw: payment,
  };
}

export interface AsaasSubscriptionInput {
  tenantId: string;
  planCode: string;
  valueCents: number;
  cycle: "MONTHLY" | "YEARLY";
  customerEmail?: string;
  customerName?: string;
  successUrl: string;
}

export async function createAsaasSubscriptionCheckout(
  env: GatewayEnv,
  input: AsaasSubscriptionInput,
  asaasFetch: AsaasFetch = fetch,
): Promise<{ checkoutUrl: string; subscriptionId: string; customerId: string }> {
  const customerId = await ensureCustomer(
    env,
    {
      name: input.customerName ?? "Tenant Inova Gastro 360",
      email: input.customerEmail,
      externalReference: `tenant:${input.tenantId}`,
    },
    asaasFetch,
  );

  const res = await asaasRequest(
    env,
    "/subscriptions",
    {
      method: "POST",
      body: JSON.stringify({
        customer: customerId,
        billingType: "CREDIT_CARD",
        value: input.valueCents / 100,
        nextDueDate: dueDatePlusMinutes(0),
        cycle: input.cycle,
        description: `Plano ${input.planCode} — Inova Gastro 360`,
        externalReference: `${input.tenantId}:${input.planCode}`,
        callback: {
          successUrl: input.successUrl,
          autoRedirect: true,
        },
      }),
    },
    asaasFetch,
  );
  const data = (await res.json()) as {
    id?: string;
    paymentLink?: string;
    invoiceUrl?: string;
  };
  if (!res.ok || !data.id) {
    throw new Error(`asaas_subscription_failed:${res.status}`);
  }

  const checkoutUrl =
    data.paymentLink ??
    data.invoiceUrl ??
    `${asaasBaseUrl(env).replace("/api/v3", "")}/i/subscription/${data.id}`;

  return { checkoutUrl, subscriptionId: data.id, customerId };
}

export async function fetchAsaasPayment(
  env: GatewayEnv,
  paymentId: string,
  asaasFetch: AsaasFetch = fetch,
): Promise<Record<string, unknown>> {
  const res = await asaasRequest(env, `/payments/${paymentId}`, { method: "GET" }, asaasFetch);
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error(`asaas_fetch_payment_failed:${res.status}`);
  return data;
}
