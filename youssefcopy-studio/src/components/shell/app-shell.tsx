"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useTheme } from "next-themes";
import {
  Building2,
  ChevronsLeft,
  ChevronsRight,
  Gauge,
  LayoutDashboard,
  LayoutTemplate,
  Layers,
  Menu,
  Microscope,
  Moon,
  PackageCheck,
  PenLine,
  Settings,
  Sparkles,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/brands", label: "Brands", icon: Building2 },
  { href: "/research", label: "Brand Research", icon: Microscope },
  { href: "/campaigns", label: "Campaign Builder", icon: Layers },
  { href: "/generate", label: "AI Email Generator", icon: Sparkles },
  { href: "/editor", label: "Email Editor", icon: PenLine },
  { href: "/analyzer", label: "Copywriting Analyzer", icon: Gauge },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/delivery", label: "Client Delivery", icon: PackageCheck },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function ThemeToggle({ compact }: { compact?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- avoid hydration mismatch for theme icon
  useEffect(() => setMounted(true), []);
  const dark = !mounted || resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? <Sun className="size-4 shrink-0" /> : <Moon className="size-4 shrink-0" />}
      {!compact && <span>{dark ? "Light mode" : "Dark mode"}</span>}
    </button>
  );
}

function NavList({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            title={collapsed ? item.label : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              active ? "text-sidebar-foreground" : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId="nav-active"
                className="absolute inset-0 rounded-lg bg-sidebar-accent ring-1 ring-sidebar-border"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <Icon className={cn("relative size-4 shrink-0", active && "text-primary")} />
            {!collapsed && <span className="relative truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function Wordmark({ collapsed }: { collapsed: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-lg px-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary font-display text-sm text-white shadow-[0_0_24px_-4px_#0057ff]">Y</span>
      {!collapsed && (
        <span className="leading-tight">
          <span className="block font-display text-[15px]">YoussefCopy</span>
          <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Email Studio</span>
        </span>
      )}
    </Link>
  );
}

export function AppShell({ children, aiAvailable }: { children: React.ReactNode; aiAvailable: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore persisted UI preference after mount
    setCollapsed(localStorage.getItem("ycs.sidebar") === "collapsed");
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      localStorage.setItem("ycs.sidebar", c ? "expanded" : "collapsed");
      return !c;
    });
  };

  const aiBadge = (compact: boolean) => (
    <div
      className={cn("flex items-center gap-2 rounded-lg border border-sidebar-border px-2.5 py-2 text-xs", compact && "justify-center px-0")}
      title={aiAvailable ? "Live AI generation is configured" : "AI not configured — manual mode"}
    >
      <span className={cn("size-2 shrink-0 rounded-full", aiAvailable ? "bg-success shadow-[0_0_8px] shadow-success" : "bg-muted-foreground/50")} />
      {!compact && <span className="text-muted-foreground">{aiAvailable ? "AI connected" : "Manual mode · AI off"}</span>}
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 68 : 248 }}
        transition={{ type: "spring", stiffness: 400, damping: 40 }}
        className="no-print sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 md:flex"
      >
        <div className="mb-6 flex items-center justify-between">
          <Wordmark collapsed={collapsed} />
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavList collapsed={collapsed} />
        </div>
        <div className="mt-4 flex flex-col gap-1.5">
          {aiBadge(collapsed)}
          <ThemeToggle compact={collapsed} />
          <button
            type="button"
            onClick={toggle}
            className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </motion.aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:hidden">
          <Wordmark collapsed={false} />
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 hover:bg-muted"
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
        </header>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 bg-sidebar p-4">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="mb-6 mt-1">
              <Wordmark collapsed={false} />
            </div>
            <NavList collapsed={false} onNavigate={() => setMobileOpen(false)} />
            <div className="mt-6 flex flex-col gap-1.5">
              {aiBadge(false)}
              <ThemeToggle />
            </div>
          </SheetContent>
        </Sheet>
        <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
