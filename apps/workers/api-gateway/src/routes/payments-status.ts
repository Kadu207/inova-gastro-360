import { jsonResponse } from "../lib";
import type { GatewayEnv } from "../types/env";
import {
  isAsaasConfigured,
  isMercadoPagoConfigured,
  isStripeConfigured,
  isPaymentsEnabled,
  orderPaymentProvider,
  billingProvider,
  webhookUrls,
} from "../lib/payments-config";

/** Status público — sem expor segredos. */
export async function handlePaymentsStatus(
  _request: Request,
  env: GatewayEnv,
): Promise<Response> {
  const asaas = isAsaasConfigured(env);
  const mp = isMercadoPagoConfigured(env);
  const stripe = isStripeConfigured(env);
  const orderProvider = orderPaymentProvider(env);
  const billProvider = billingProvider(env);
  return jsonResponse({
    enabled: isPaymentsEnabled(env),
    asaas,
    mercadoPago: mp,
    stripe,
    orderPaymentProvider: orderProvider,
    billingProvider: billProvider,
    deliveryOnlinePayment: orderProvider === "asaas" ? asaas : mp,
    saasBilling: billProvider === "asaas" ? asaas : stripe,
    webhookUrls: webhookUrls(env),
    message: isPaymentsEnabled(env)
      ? "Pagamentos online ativos (Asaas BR / Stripe fallback)"
      : "Infraestrutura pronta — aguardando credenciais Asaas (ou Stripe fallback)",
  });
}
