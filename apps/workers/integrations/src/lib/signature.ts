import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Valida assinatura x-signature do Mercado Pago (manifest id;request-id;ts).
 * @see https://www.mercadopago.com.br/developers/en/docs/your-integrations/notifications/webhooks
 */
export function verifyMercadoPagoSignature(
  headers: Headers,
  body: string,
  secret: string | undefined,
): boolean {
  if (!secret) return false;

  const xSignature = headers.get("x-signature");
  const xRequestId = headers.get("x-request-id");
  if (!xSignature || !xRequestId) return false;

  let ts = "";
  let v1 = "";
  for (const part of xSignature.split(",")) {
    const [k, val] = part.split("=").map((s) => s.trim());
    if (k === "ts") ts = val;
    if (k === "v1") v1 = val;
  }
  if (!ts || !v1) return false;

  let dataId = "";
  try {
    const parsed = JSON.parse(body) as { data?: { id?: string | number } };
    dataId = String(parsed.data?.id ?? "");
  } catch {
    return false;
  }

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
  } catch {
    return false;
  }
}

/** Stripe usa constructEvent no SDK — placeholder para testes unitários sem SDK. */
export function verifyStripeSignature(
  _payload: string,
  _signature: string | null,
  _secret: string | undefined,
): boolean {
  return false;
}
