const MESSAGES: Record<string, string> = {
  invalid_credentials:
    "E-mail ou senha incorretos. Demo local: admin@inovagastro360.local / InovaGastro360!",
  tenant_not_found: "Tenant não encontrado. Use o slug demo-burger.",
  validation_error: "Dados inválidos. Verifique e-mail, senha e tenant.",
  internal_error: "Erro no servidor. Confira se a API local está em :8792 com db:seed.",
};

export function loginErrorMessage(code: string | undefined, apiBase: string): string {
  if (code && MESSAGES[code]) return MESSAGES[code];
  if (code) return code;
  return `Falha no login (API: ${apiBase})`;
}
