"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/api";
import { MAIN_NAV } from "@/lib/nav";

export default function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "#") return false;
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="os-sidebar">
      <div className="os-brand">
        <span className="os-brand-icon" aria-hidden>
          🍳
        </span>
        <div>
          <strong>
            INOVA GASTRO <span className="os-badge">OS</span>
          </strong>
          <p>Do pedido à entrega, tudo em um só lugar.</p>
        </div>
      </div>

      <nav className="os-nav">
        {MAIN_NAV.map((item) =>
          item.disabled ? (
            <span key={item.label} className="os-nav-item disabled" title="Em breve">
              <span className="os-nav-icon">{item.icon}</span>
              {item.label}
            </span>
          ) : (
            <Link
              key={item.label}
              href={item.href}
              className={`os-nav-item${isActive(item.href) ? " active" : ""}`}
            >
              <span className="os-nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ),
        )}
      </nav>

      <div className="os-sidebar-footer">
        <button type="button" className="os-logout-btn os-logout-sidebar" onClick={logout}>
          Sair da conta
        </button>
        <div className="os-sidebar-cta">
          <p className="os-cta-title">Saiba mais</p>
          <p className="os-cta-text">Plataforma completa para hamburgueria e delivery.</p>
        </div>
      </div>
    </aside>
  );
}
