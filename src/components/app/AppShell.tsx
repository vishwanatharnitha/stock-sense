import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Package, Tags, RefreshCcw, PackagePlus, Truck, ArrowLeftRight, SlidersHorizontal,
  History, Warehouse, MapPin, User, LogOut, Search, Bell, PanelLeftClose, PanelLeftOpen, Menu, AlertTriangle,
} from "lucide-react";
import type { User as AuthUser } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { productsQuery, stockQuery, profileQuery } from "@/services/inventory";
import { buildInventory } from "@/lib/inventory-logic";
import { fmtNum } from "@/lib/format";

const NAV = [
  { group: "Overview", items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    group: "Inventory",
    items: [
      { to: "/products", label: "Products", icon: Package },
      { to: "/categories", label: "Categories", icon: Tags },
      { to: "/reordering", label: "Reordering Rules", icon: RefreshCcw },
    ],
  },
  {
    group: "Operations",
    items: [
      { to: "/receipts", label: "Receipts", icon: PackagePlus },
      { to: "/deliveries", label: "Delivery Orders", icon: Truck },
      { to: "/transfers", label: "Internal Transfers", icon: ArrowLeftRight },
      { to: "/adjustments", label: "Inventory Adjustments", icon: SlidersHorizontal },
      { to: "/ledger", label: "Move History", icon: History },
    ],
  },
  {
    group: "Configuration",
    items: [
      { to: "/warehouses", label: "Warehouses", icon: Warehouse },
      { to: "/locations", label: "Locations", icon: MapPin },
    ],
  },
] as const;

function NavList({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };
  const itemCls = (active: boolean) =>
    cn(
      "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
      active ? "bg-sidebar-accent text-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-foreground",
      collapsed && "justify-center px-0",
    );
  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
      {NAV.map((g) => (
        <div key={g.group}>
          {!collapsed && <div className="mb-1.5 px-2.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">{g.group}</div>}
          <div className="space-y-0.5">
            {g.items.map((it) => {
              const active = path === it.to || path.startsWith(it.to + "/");
              const Icon = it.icon;
              return (
                <Link key={it.to} to={it.to} onClick={onNavigate} className={itemCls(active)} title={collapsed ? it.label : undefined}>
                  {active && <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-primary" />}
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "")} strokeWidth={1.75} />
                  {!collapsed && <span className="truncate">{it.label}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
      <div className="mt-auto">
        {!collapsed && <div className="mb-1.5 px-2.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">Account</div>}
        <Link to="/profile" onClick={onNavigate} className={itemCls(path === "/profile")} title={collapsed ? "My Profile" : undefined}>
          <User className="h-4 w-4" strokeWidth={1.75} />{!collapsed && "My Profile"}
        </Link>
        <button onClick={signOut} className={cn(itemCls(false), "w-full")} title={collapsed ? "Logout" : undefined}>
          <LogOut className="h-4 w-4" strokeWidth={1.75} />{!collapsed && "Logout"}
        </button>
      </div>
    </nav>
  );
}

function Notifications() {
  const products = useQuery(productsQuery);
  const stock = useQuery(stockQuery);
  const alerts = buildInventory(products.data ?? [], stock.data ?? []).filter((p) => p.status !== "healthy");
  return (
    <Popover>
      <PopoverTrigger className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" aria-label="Notifications">
        <Bell className="h-4 w-4" />
        {alerts.length > 0 && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-warning" />}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3 text-sm font-medium">Stock alerts <span className="text-muted-foreground">· {alerts.length}</span></div>
        <div className="max-h-80 overflow-y-auto">
          {alerts.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">All products are above reorder level.</p>}
          {alerts.map((p) => (
            <Link key={p.id} to="/products/$id" params={{ id: p.id }} className="flex items-start gap-3 border-b border-border px-4 py-3 last:border-0 hover:bg-accent/50">
              <AlertTriangle className={cn("mt-0.5 h-4 w-4", p.status === "out" ? "text-destructive" : "text-warning")} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  {p.status === "out" ? "Out of stock" : `${fmtNum(p.total)} ${p.uom} · reorder at ${fmtNum(p.reorder_level)}`}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AppShell({ user, children }: { user: AuthUser; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const profile = useQuery(profileQuery(user.id));
  const name = profile.data?.full_name || user.email?.split("@")[0] || "User";
  const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={cn("sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex", collapsed ? "w-[68px]" : "w-[248px]")}>
        <div className={cn("flex h-14 items-center border-b border-sidebar-border px-4", collapsed && "justify-center px-0")}>
          <Link to="/dashboard"><Logo compact={collapsed} inverse /></Link>
        </div>
        <NavList collapsed={collapsed} />
        <button onClick={() => setCollapsed((c) => !c)} className="flex h-11 items-center justify-center gap-2 border-t border-sidebar-border text-xs text-muted-foreground hover:text-foreground">
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" /> Collapse</>}
        </button>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex w-[260px] flex-col bg-sidebar p-0">
          <div className="flex h-14 items-center border-b border-sidebar-border px-4"><Logo inverse /></div>
          <NavList onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          <button className="rounded-lg p-2 text-muted-foreground hover:bg-accent lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-4 w-4" />
          </button>
          <form
            className="relative max-w-md flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/products", search: { q } });
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products or SKU…"
              className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-ring/30"
            />
          </form>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="mr-2 hidden items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-muted-foreground md:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />All warehouses
            </div>
            <Notifications />
            <DropdownMenu>
              <DropdownMenuTrigger className="ml-1 flex items-center gap-2 rounded-lg p-1 hover:bg-accent">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-[11px] font-semibold text-primary">{initials}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-sm">{name}</div>
                  <div className="truncate text-xs font-normal text-muted-foreground">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}><User className="h-4 w-4" />My profile</DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate({ to: "/auth" });
                  }}
                >
                  <LogOut className="h-4 w-4" />Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 animate-fade-up sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
