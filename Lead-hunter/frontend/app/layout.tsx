import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "Lead Hunter BH",
  description: "Prospecção comercial em Belo Horizonte",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>
          <div className="flex min-h-screen">
            <Nav />
            <main className="flex-1 px-8 py-6">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
