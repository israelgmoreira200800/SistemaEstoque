import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Vertice", template: "%s | Vertice" },
  description: "Controle operacional de estoque, pedidos e produção.",
  icons: {
    icon: "/brand/vertice-app-icon.png",
    apple: "/brand/vertice-app-icon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

