"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Search,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Menu,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", href: "/", icon: LayoutDashboard },
  { id: "departamentos", label: "Departamentos", href: "/departamentos/atendimento", icon: Package },
  { id: "startups", label: "Buscar Startups", href: "/startups", icon: Search },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored === "dark" || (!stored && prefersDark);
    setDark(isDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else if (stored === "light") {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      localStorage.setItem("theme", "light");
    }
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/startups") return pathname === "/startups";
    return pathname.startsWith("/departamentos");
  };

  const sidebarContent = (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-gray-100 bg-white/95 backdrop-blur-xl transition-all duration-300 dark:border-gray-700 dark:bg-gray-900/95 ${
        collapsed ? "w-[4.5rem]" : "w-64"
      }`}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 border-b border-gray-100 px-3 py-3 dark:border-gray-700"
        style={{ background: "var(--grad-sidebar-hdr)" }}
      >
        {!collapsed && (
          <Image
            src="/logo-hor.svg"
            alt="LAB."
            width={256}
            height={56}
            className="h-14 w-auto"
            priority
          />
        )}
        {collapsed && (
          <Image
            src="/logo-mark.png"
            alt="LAB."
            width={36}
            height={36}
            className="mx-auto h-9 w-auto"
            priority
          />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p
          className={`mb-2 truncate px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 ${
            collapsed ? "text-center text-[0px]" : ""
          }`}
        >
          {collapsed ? "" : "DEPARTAMENTOS"}
        </p>
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  prefetch={true}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    collapsed ? "justify-center" : ""
                  } ${
                    active
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-glow"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={20} className="shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-100 p-3 dark:border-gray-700">
        <div className={`flex items-center ${collapsed ? "flex-col gap-3" : "justify-between"}`}>
          <button
            onClick={toggleDark}
            className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            title={dark ? "Modo claro" : "Modo escuro"}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            title={collapsed ? "Expandir" : "Recolher"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-30 rounded-xl bg-white p-2 shadow-md transition-colors hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu size={20} className="text-gray-600 dark:text-gray-300" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          {/* Close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="fixed right-4 top-4 z-50 rounded-xl bg-white p-2 shadow-md transition-colors hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 lg:hidden"
            aria-label="Fechar menu"
          >
            <X size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
          {/* Mobile sidebar */}
          <div className="lg:hidden">{sidebarContent}</div>
        </>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:block">{sidebarContent}</div>
    </>
  );
}
