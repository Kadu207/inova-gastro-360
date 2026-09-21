"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";
import { FOOTER_FEATURES } from "@/lib/nav";
import { ensureSession, getToken } from "@/lib/api";

const PUBLIC_PATHS = ["/cardapio"];

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard Geral",
  "/dashboard/catalogo": "Gestão do cardápio",
  "/dashboard/billing": "Assinatura SaaS",
  "/dashboard/configuracoes": "Configurações",
  "/dashboard/admin/tenants": "Tenants (plataforma)",
  "/dashboard/financeiro": "Financeiro",
  "/dashboard/lgpd": "Privacidade / LGPD",
  "/dashboard/impressao": "Impressão",
  "/cardapio": "Cardápio público",
  "/painel/delivery": "Delivery",
  "/painel/cozinha": "Cozinha / KDS",
  "/painel/balcao": "Balcão",
};

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const title = TITLES[pathname] ?? "Inova Gastro OS";
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const navPanelId = useId();

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    if (isPublic) return;
    let active = true;
    void ensureSession().then((ok) => {
      if (!active) return;
      setSessionReady(ok);
      if (!ok) router.replace("/login");
    });
    return () => {
      active = false;
    };
  }, [router, isPublic]);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setNavOpen(false);
        menuBtnRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  if (isPublic && !getToken()) {
    return (
      <div className="os-layout os-layout-public">
        <div className="os-main os-main-public">
          <div className="os-content">{children}</div>
        </div>
      </div>
    );
  }

  if (!isPublic && sessionReady !== true) return null;

  return (
    <div className={`os-layout${navOpen ? " os-nav-open" : ""}`}>
      <Sidebar
        id={navPanelId}
        open={navOpen}
        onNavigate={() => {
          setNavOpen(false);
          menuBtnRef.current?.focus();
        }}
      />
      {navOpen ? (
        <button
          type="button"
          className="os-nav-overlay"
          aria-label="Fechar menu"
          onClick={() => {
            setNavOpen(false);
            menuBtnRef.current?.focus();
          }}
        />
      ) : null}
      <div className="os-main">
        <TopHeader
          title={title}
          menuButtonRef={menuBtnRef}
          navOpen={navOpen}
          navPanelId={navPanelId}
          onToggleNav={() => setNavOpen((v) => !v)}
        />
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
