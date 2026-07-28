import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Sidebar } from "@/components/sidebar";
import { StartupDrawerProvider } from "@/components/startup-drawer-context";
import { StartupDrawer } from "@/components/startup-drawer";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowLab — Startups por Departamento",
  description:
    "Visualizacao das startups do ecossistema Cubo Itau classificadas por departamento via IA.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <StartupDrawerProvider>
          <Sidebar />
          <main className="min-h-screen overflow-x-hidden bg-slate-50 transition-all duration-300 dark:bg-gray-900 lg:ml-64">
            {children}
          </main>
          <StartupDrawer />
        </StartupDrawerProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
