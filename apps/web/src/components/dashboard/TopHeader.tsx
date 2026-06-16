"use client";

interface TopHeaderProps {
  title: string;
}

export default function TopHeader({ title }: TopHeaderProps) {
  const today = new Date().toLocaleDateString("pt-BR");

  return (
    <header className="os-topbar">
      <h1>{title}</h1>
      <div className="os-topbar-actions">
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
      </div>
    </header>
  );
}
