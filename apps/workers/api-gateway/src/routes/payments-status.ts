import { jsonResponse } from "../lib";
import type { GatewayEnv } from "../types/env";
import {
  isMercadoPagoConfigured,
  isStripeConfigured,
  isPaymentsEnabled,
  webhookUrls,
} from "../lib/payments-config";

/** Status público — sem expor segredos. */
export async function handlePaymentsStatus(
  _request: Request,
  env: GatewayEnv,
): Promise<Response> {
  const mp = isMercadoPagoConfigured(env);
  const stripe = isStripeConfigured(env);
  return jsonResponse({
    enabled: isPaymentsEnabled(env),
    mercadoPago: mp,
    stripe,
    deliveryOnlinePayment: mp,
    saasBilling: stripe,
    webhookUrls: webhookUrls(env),
    message: isPaymentsEnabled(env)
      ? "Pagamentos online ativos"
      : "Infraestrutura pronta — aguardando credenciais Mercado Pago / Stripe",
  });
}
