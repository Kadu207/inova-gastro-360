import type { GatewayEnv } from "../types/env";

const PLACEHOLDER = /^(CHANGE_ME|your-|price_test_|price_CHANGE_ME|sk_test_CHANGE_ME|whsec_CHANGE_ME)/i;

function isRealSecret(value: string | undefined): boolean {
  const v = value?.trim();
  if (!v) return false;
  if (PLACEHOLDER.test(v)) return false;
  return true;
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

/** Pagamentos online ativos (PIX/cartão + checkout SaaS). */
export function isPaymentsEnabled(env: GatewayEnv): boolean {
  const flag = env.PAYMENTS_ENABLED?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return false;
  if (flag === "true" || flag === "1") {
    return isMercadoPagoConfigured(env) || isStripeConfigured(env);
  }
  // Sem flag explícita: ativo só se houver credencial real
  return isMercadoPagoConfigured(env) || isStripeConfigured(env);
}

export function paymentsPublicBaseUrl(env: GatewayEnv): string {
  const explicit = env.PAYMENTS_PUBLIC_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const cors = env.CORS_ALLOWED_ORIGINS?.split(",")[0]?.trim();
  if (cors) return cors.replace(/\/$/, "");

  return "https://inovagastro360.inovatitech.com.br";
}

export function webhookUrls(env: GatewayEnv): { mercadopago: string; stripe: string } {
  const base = paymentsPublicBaseUrl(env);
  return {
    mercadopago: `${base}/webhooks/mercadopago`,
    stripe: `${base}/webhooks/stripe`,
  };
}
