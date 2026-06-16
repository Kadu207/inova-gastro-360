import type { Metadata } from "next";
import CookieBanner from "@/components/CookieBanner";
import "./globals.css";
export const metadata: Metadata = {
  title: "Inova Gastro 360",
  description: "SaaS para hamburgueria, delivery e gestão operacional",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
