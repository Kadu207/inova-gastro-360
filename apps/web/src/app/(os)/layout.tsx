import DashboardShell from "@/components/dashboard/DashboardShell";

export default function OsLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
