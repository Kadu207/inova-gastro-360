"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";
import { FOOTER_FEATURES } from "@/lib/nav";
import { getToken } from "@/lib/api";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard Geral",
  "/cardapio": "Cardápio",
  "/painel/delivery": "Delivery",
  "/painel/cozinha": "Cozinha / KDS",
  "/painel/balcao": "Balcão",
  "/dashboard/impressao": "Impressão",
};

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const title = TITLES[pathname] ?? "Inova Gastro OS";

  useEffect(() => {
    if (!getToken()) router.replace("/login");
  }, [router]);

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
