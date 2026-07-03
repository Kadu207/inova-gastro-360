const MESSAGES: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  tenant_required: "Informe o tenant (slug) para este e-mail.",
  tenant_not_found: "Tenant não encontrado. Verifique o slug informado.",
  too_many_attempts: "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.",
  validation_error: "Dados inválidos. Verifique e-mail, senha e tenant.",
  server_misconfigured: "Servidor mal configurado. Contate o administrador.",
  internal_error: "Erro no servidor. Confira se a API local está em :8792 com db:seed.",
};

export function loginErrorMessage(code: string | undefined, apiBase: string): string {
  if (code && MESSAGES[code]) return MESSAGES[code];
  if (code) return code;
  return `Falha no login (API: ${apiBase})`;
}
