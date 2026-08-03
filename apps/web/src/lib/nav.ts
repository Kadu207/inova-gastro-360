export interface NavItem {
  href: string;
  label: string;
  icon: string;
  disabled?: boolean;
}

export const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "◉" },
  { href: "/painel/delivery", label: "Pedidos", icon: "◎" },
  { href: "/painel/balcao", label: "Balcão", icon: "▣" },
  { href: "/dashboard/catalogo", label: "Gestão cardápio", icon: "✎" },
  { href: "/dashboard/billing", label: "Assinatura", icon: "◆" },
  { href: "/cardapio", label: "Cardápio público", icon: "☰" },
  { href: "/painel/cozinha", label: "Cozinha (KDS)", icon: "◫" },
  { href: "/dashboard/impressao", label: "Impressão", icon: "⎙" },
  { href: "/painel/delivery", label: "Delivery", icon: "➤" },
  { href: "#", label: "Clientes", icon: "◌", disabled: true },
  { href: "/dashboard/financeiro", label: "Financeiro", icon: "◈" },
  { href: "/dashboard/lgpd", label: "Privacidade / LGPD", icon: "🔒" },
  { href: "#", label: "Relatórios", icon: "▤", disabled: true },
  { href: "#", label: "Atendimento", icon: "◍", disabled: true },
  { href: "#", label: "Estoque", icon: "▦", disabled: true },
  { href: "#", label: "Promoções", icon: "★", disabled: true },
  { href: "/dashboard/configuracoes", label: "Configurações", icon: "⚙" },
  { href: "/dashboard/admin/tenants", label: "Tenants", icon: "⬡" },
];

export const FOOTER_FEATURES = [
  "Multiempresa / multifilial",
  "Cardápio online",
  "Delivery inteligente",
  "Financeiro completo",
  "Atendimento integrado",
  "Relatórios em tempo real",
  "Segurança e LGPD",
];
