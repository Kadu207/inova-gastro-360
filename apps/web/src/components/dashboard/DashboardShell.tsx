"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";
import { FOOTER_FEATURES } from "@/lib/nav";
import { getToken } from "@/lib/api";

const PUBLIC_PATHS = ["/cardapio"];

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard Geral",
  "/dashboard/catalogo": "Gestão do cardápio",
  "/dashboard/billing": "Assinatura SaaS",
  "/cardapio": "Cardápio público",
  "/painel/delivery": "Delivery",
  "/painel/cozinha": "Cozinha / KDS",
  "/painel/balcao": "Balcão",
  "/dashboard/impressao": "Impressão",
  "/dashboard/financeiro": "Financeiro",
};

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const title = TITLES[pathname] ?? "Inova Gastro OS";

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    if (!isPublic && !getToken()) router.replace("/login");
  }, [router, isPublic]);

  if (isPublic && !getToken()) {
    return (
      <div className="os-layout os-layout-public">
        <div className="os-main os-main-public">
          <div className="os-content">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="os-layout">
      <Sidebar />
      <div className="os-main">
        <TopHeader title={title} />
        <div className="os-content">{children}</div>
        <footer className="os-features-bar">
          {FOOTER_FEATURES.map((f) => (
            <span key={f}>{f}</span>
          ))}
        </footer>
      </div>
    </div>
  );
}
