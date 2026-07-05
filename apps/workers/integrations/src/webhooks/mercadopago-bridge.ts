/** Parse external_reference — duplicado aqui para evitar dependência circular com api-gateway. */
export function parseExternalReference(ref: string): { tenantId: string; orderId: string } | null {
  const parts = ref.split(":");
  if (parts.length !== 2) return null;
  const [tenantId, orderId] = parts;
  if (!tenantId || !orderId) return null;
  return { tenantId, orderId };
}
