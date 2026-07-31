import type { GatewayEnv } from "../types/env";

const PLACEHOLDER = /^(CHANGE_ME|your-|price_test_|price_CHANGE_ME|sk_test_CHANGE_ME|whsec_CHANGE_ME)/i;

function isRealSecret(value: string | undefined): boolean {
  const v = value?.trim();
  if (!v) return false;
  if (PLACEHOLDER.test(v)) return false;
  return true;
}

export function isAsaasConfigured(env: GatewayEnv): boolean {
  const key = env.ASAAS_API_KEY?.trim();
  if (!isRealSecret(key)) return false;
  // Tokens Asaas costumam ser longos ($aact_... em versões antigas ou JWT-like)
  return key!.length >= 20;
}

export function isMercadoPagoConfigured(env: GatewayEnv): boolean {
  const token = env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!isRealSecret(token)) return false;
  return token!.startsWith("TEST-") || token!.startsWith("APP_USR-");
}

export function isStripeConfigured(env: GatewayEnv): boolean {
  const key = env.STRIPE_SECRET_KEY?.trim();
  if (!isRealSecret(key)) return false;
  return key!.startsWith("sk_test_") || key!.startsWith("sk_live_");
}

export function orderPaymentProvider(env: GatewayEnv): "asaas" | "mercadopago" {
  const v = env.ORDER_PAYMENT_PROVIDER?.trim().toLowerCase();
  if (v === "mercadopago") return "mercadopago";
  return "asaas";
}

export function billingProvider(env: GatewayEnv): "asaas" | "stripe" {
  const v = env.BILLING_PROVIDER?.trim().toLowerCase();
  if (v === "stripe") return "stripe";
  return "asaas";
}

/** Pagamentos online ativos (PIX/cartão + checkout SaaS). */
export function isPaymentsEnabled(env: GatewayEnv): boolean {
  const flag = env.PAYMENTS_ENABLED?.trim().toLowerCase();
  const anyConfigured =
    isAsaasConfigured(env) || isMercadoPagoConfigured(env) || isStripeConfigured(env);
  if (flag === "false" || flag === "0") return false;
  if (flag === "true" || flag === "1") return anyConfigured;
  return anyConfigured;
}

export function isOrderPaymentsReady(env: GatewayEnv): boolean {
  if (!isPaymentsEnabled(env)) return false;
  return orderPaymentProvider(env) === "asaas"
    ? isAsaasConfigured(env)
    : isMercadoPagoConfigured(env);
}

export function isBillingReady(env: GatewayEnv): boolean {
  if (!isPaymentsEnabled(env)) return false;
  return billingProvider(env) === "asaas" ? isAsaasConfigured(env) : isStripeConfigured(env);
}

export function paymentsPublicBaseUrl(env: GatewayEnv): string {
  const explicit = env.PAYMENTS_PUBLIC_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const cors = env.CORS_ALLOWED_ORIGINS?.split(",")[0]?.trim();
  if (cors) return cors.replace(/\/$/, "");

  return "https://inovagastro360.inovatitech.com.br";
}

export function webhookUrls(env: GatewayEnv): {
  asaas: string;
  mercadopago: string;
  stripe: string;
} {
  const base = paymentsPublicBaseUrl(env);
  return {
    asaas: `${base}/webhooks/asaas`,
    mercadopago: `${base}/webhooks/mercadopago`,
    stripe: `${base}/webhooks/stripe`,
  };
}
