"use client";

import { useEffect, useState, type RefObject } from "react";
import {
  fetchSettingsBranches,
  getActiveBranchId,
  logout,
  setActiveBranchId,
  type SettingsBranch,
} from "@/lib/api";

interface TopHeaderProps {
  title: string;
  menuButtonRef?: RefObject<HTMLButtonElement | null>;
  navOpen?: boolean;
  navPanelId?: string;
  onToggleNav?: () => void;
}

export default function TopHeader({
  title,
  menuButtonRef,
  navOpen = false,
  navPanelId,
  onToggleNav,
}: TopHeaderProps) {
  const today = new Date().toLocaleDateString("pt-BR");
  const [branches, setBranches] = useState<SettingsBranch[]>([]);
  const [active, setActive] = useState("");

  useEffect(() => {
    setActive(getActiveBranchId());
    void fetchSettingsBranches()
      .then((list) => {
        setBranches(list.filter((b) => b.isActive));
      })
      .catch(() => setBranches([]));
  }, []);

  function onBranchChange(branchId: string) {
    setActiveBranchId(branchId);
    setActive(branchId);
  }

  return (
    <header className="os-topbar">
      <div className="os-topbar-start">
        {onToggleNav ? (
          <button
            ref={menuButtonRef}
            type="button"
            className="os-menu-btn"
            aria-label={navOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={navOpen}
            aria-controls={navPanelId}
            onClick={onToggleNav}
          >
            <span aria-hidden>{navOpen ? "✕" : "☰"}</span>
          </button>
        ) : null}
        <h1>{title}</h1>
      </div>
      <div className="os-topbar-actions">
        {branches.length > 0 ? (
          <label className="os-date-picker" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span className="sr-only">Filial</span>
            <select
              aria-label="Filial ativa"
              value={active}
              onChange={(e) => onBranchChange(e.target.value)}
              style={{ background: "transparent", border: "none", color: "inherit", maxWidth: 160 }}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button type="button" className="os-date-picker">
          {today}
          <span aria-hidden>▾</span>
        </button>
        <button type="button" className="os-icon-btn" aria-label="Notificações">
          🔔
          <span className="os-dot" />
        </button>
        <div className="os-user">
          <span className="os-avatar">IB</span>
          <div>
            <strong>Inova Burger</strong>
            <span>Administrador</span>
          </div>
        </div>
        <button type="button" className="os-logout-btn" onClick={logout} title="Encerrar sessão">
          Sair
        </button>
      </div>
    </header>
  );
}
