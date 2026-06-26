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
  { href: "/cardapio", label: "Cardápio", icon: "☰" },
  { href: "/painel/cozinha", label: "Cozinha (KDS)", icon: "◫" },
  { href: "/dashboard/impressao", label: "Impressão", icon: "⎙" },
  { href: "/painel/delivery", label: "Delivery", icon: "➤" },
  { href: "#", label: "Clientes", icon: "◌", disabled: true },
  { href: "#", label: "Financeiro", icon: "◈", disabled: true },
  { href: "#", label: "Relatórios", icon: "▤", disabled: true },
  { href: "#", label: "Atendimento", icon: "◍", disabled: true },
  { href: "#", label: "Estoque", icon: "▦", disabled: true },
  { href: "#", label: "Promoções", icon: "★", disabled: true },
  { href: "#", label: "Configurações", icon: "⚙", disabled: true },
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
