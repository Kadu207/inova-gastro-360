export const APP_NAME = "Inova Gastro 360" as const;
export const APP_SLUG = "inova-gastro-360" as const;

export const PORTS = {
  WEB: 3102,
  API_DEV: 3101,
  POSTGRES: 5440,
  REDIS: 6390,
  WRANGLER_API: 8792,
  WRANGLER_MSG: 8789,
  WRANGLER_RT: 8790,
  WRANGLER_INT: 8791,
} as const;

export const DOMAINS = {
  PRODUCTION: "inovagastro360.inovatitech.com.br",
  /** Um nível sob inovatitech.com.br — coberto pelo SSL Universal Free */
  API: "inovagastro360-api.inovatitech.com.br",
  REALTIME: "inovagastro360-rt.inovatitech.com.br",
} as const;

/** Onda 1+: escopo de entrega por fase */
export const PHASE_SCOPE = {
  ONDA_1: ["auth-multitenant", "rls", "cloudflare-base", "hyperdrive-prep"],
  ONDA_2: ["cardapio", "pedidos", "paineis", "mensageria"],
  ONDA_3: ["impressao", "integracoes", "realtime"],
  ONDA_4: ["financeiro-completo", "pagamentos-tef", "lgpd-avancado"],
} as const;

export const ROLES = [
  "super_admin",
  "admin_cliente",
  "gestor_filial",
  "caixa",
  "atendente",
  "cozinha",
  "entregador",
  "financeiro",
] as const;

export type Role = (typeof ROLES)[number];
