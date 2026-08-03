import DashboardShell from "@/components/dashboard/DashboardShell";

/** Layout compartilhado do OS (dashboard / painéis / cardápio) — sem route group `(os)`. */
export default function OsShellLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
