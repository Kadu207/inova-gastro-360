/** Segredos de runtime compartilhados entre workers Node/Workers. */

const MIN_SECRET_LENGTH = 16;

/** Placeholders comuns em .env.example que nunca devem ser aceitos em runtime. */
const PLACEHOLDER =
  /^(CHANGE_ME|changeme|your-|replace_|todo_|example_|price_test_|price_CHANGE_ME|sk_test_CHANGE_ME|whsec_CHANGE_ME)/i;

export function isNonProductionEnvironment(environment?: string): boolean {
  const v = (environment ?? "").trim().toLowerCase();
  return v === "development" || v === "dev" || v === "test" || v === "local";
}

export function isUsableSecret(
  value: string | undefined | null,
  options?: { minLength?: number },
): boolean {
  const v = value?.trim();
  if (!v) return false;
  const minLength = options?.minLength ?? MIN_SECRET_LENGTH;
  if (v.length < minLength) return false;
  if (PLACEHOLDER.test(v)) return false;
  return true;
}

/** Token/secret de webhook: rejeita vazio/placeholder; comprimento mínimo menor. */
export function isUsableWebhookSecret(value: string | undefined | null): boolean {
  return isUsableSecret(value, { minLength: 8 });
}

/**
 * Autorização de rotas /internal/*.
 * - Secret utilizável: exige header `x-internal-secret` igual.
 * - Sem secret utilizável: libera somente em ENVIRONMENT=test (CI/unit).
 * - development/local/produção sem secret: nega (fail-closed).
 */
export function isInternalRequestAuthorized(
  request: Request,
  env: { INTERNAL_SHARED_SECRET?: string; ENVIRONMENT?: string },
): boolean {
  const secret = env.INTERNAL_SHARED_SECRET?.trim();
  if (!isUsableSecret(secret)) {
    return (env.ENVIRONMENT ?? "").trim().toLowerCase() === "test";
  }
  return request.headers.get("x-internal-secret") === secret;
}

export function assertUsableSecret(value: string | undefined | null, name: string): string {
  const v = value?.trim();
  if (!isUsableSecret(v)) {
    throw new Error(
      `${name} ausente, muito curto (mín. ${MIN_SECRET_LENGTH}) ou placeholder (CHANGE_ME/your-*).`,
    );
  }
  return v!;
}

export { MIN_SECRET_LENGTH };
