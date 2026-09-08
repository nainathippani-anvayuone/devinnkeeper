import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { NotificationBell } from "./NotificationBell";
import {
  LayoutDashboard,
  LogOut,
  DoorOpen,
  CreditCard,
  Car,
  BookOpen,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Users,
  CalendarDays,
  Sparkles,
  ShieldCheck,
  Wrench,
  PanelLeft,
  Settings,
  Globe,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Switch } from "./ui/switch";
import SettingsModal from "./dashboard/SettingsModal";
import { useTranslation } from "react-i18next";

const navItems = [
  { icon: LayoutDashboard, key: "dashboard", label: "Dashboard", path: "/" },
  { icon: CalendarDays, key: "reservations", label: "Reservations", path: "/reservations" },
  { icon: ShieldCheck, key: "checkin", label: "Check-In & Keys", path: "/checkin" },
  { icon: Users, key: "guests", label: "Guests", path: "/guests" },
  { icon: CreditCard, key: "payments", label: "Payments", path: "/payments" },
  { icon: Sparkles, key: "housekeeping", label: "Housekeeping", path: "/housekeeping" },
  { icon: Wrench, key: "maintenance", label: "Maintenance", path: "/maintenance" },
  { icon: Car, key: "vehicles", label: "Vehicles", path: "/vehicles" },
  { icon: BookOpen, key: "cashLedger", label: "Cash Ledger", path: "/cash-ledger" },
  { icon: ClipboardList, key: "shiftAudits", label: "Shift Audits", path: "/shift-audits" },
  { icon: Settings, key: "settings", label: "Settings", isSettings: true, path: "/settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthContext();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const { theme, toggleTheme, switchable } = useTheme();
  const { logout } = useAuthContext();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  };

  const getLocaleDateStr = () => {
    const currentLang = i18n.language || "en";
    const localeMap: Record<string, string> = { hi: "hi-IN", te: "te-IN", en: "en-US" };
    try {
      return new Date().toLocaleDateString(localeMap[currentLang] || "en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    } catch (e) {
      return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    }
  };

  if (loading) return <DashboardLayoutSkeleton />;

  const activeNavItem = navItems.find((i) =>
    (i as any).isSettings
      ? isSettingsOpen
      : i.path === "/"
      ? location === "/"
      : location.startsWith(i.path)
  );

  return (
    <div className="flex min-h-screen bg-background relative overflow-x-hidden">
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Mobile Drawer Overlay Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar (Desktop & Mobile Slide-over) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out md:static md:z-auto ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
        } ${collapsed ? "w-[68px]" : "w-[240px]"} shrink-0`}
      >
        {/* Logo Header */}
        <div className="flex h-16 items-center justify-center relative border-b border-border px-3 shrink-0">
          {collapsed ? (
            <button
              onClick={toggleCollapsed}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground transition-all shadow-2xs cursor-pointer"
              title="Click to expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeft className="h-5 w-5" />
            </button>
          ) : (
            <div className="flex items-center gap-3 w-full px-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-sm">
                <DoorOpen className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground leading-tight truncate">
                  {t("navigation.appName")}
                </p>
                <p className="text-[11px] font-medium text-muted-foreground truncate">
                  {t("navigation.motelOperations")}
                </p>
              </div>
              <button
                onClick={toggleCollapsed}
                className="hidden md:flex h-7 w-7 items-center justify-center rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex md:hidden h-7 w-7 items-center justify-center rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Close mobile menu"
                aria-label="Close mobile menu"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = (item as any).isSettings
              ? isSettingsOpen
              : item.path === "/"
              ? location === "/"
              : location.startsWith(item.path);
            const translatedLabel = t(`navigation.${item.key}`, item.label);

            return (
              <button
                key={item.key}
                onClick={() => {
                  if ((item as any).isSettings) {
                    setIsSettingsOpen(true);
                  } else {
                    setLocation(item.path);
                  }
                  setMobileOpen(false);
                }}
                title={translatedLabel}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <item.icon className="h-4.5 w-4.5 shrink-0" />
                {!collapsed && <span>{translatedLabel}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        {switchable && !collapsed && (
          <div className="border-t border-border p-3">
            <div className="flex items-center justify-between rounded-xl bg-accent/60 px-3 py-2">
              <div className="flex items-center gap-2">
                {theme === "dark" ? (
                  <Moon className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <Sun className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className="text-xs font-medium">
                  {theme === "dark" ? "Dark" : "Light"} Mode
                </span>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={() => toggleTheme?.()}
                className="scale-75"
              />
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-x-hidden">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/60 backdrop-blur px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex md:hidden h-9 w-9 items-center justify-center rounded-xl border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shadow-2xs cursor-pointer"
              title="Toggle mobile menu"
              aria-label="Toggle mobile menu"
            >
              <PanelLeft className="h-4.5 w-4.5 text-foreground" />
            </button>
            <button
              onClick={toggleCollapsed}
              className="hidden md:flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shadow-2xs cursor-pointer"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label="Toggle sidebar"
            >
              <PanelLeft className="h-4.5 w-4.5 text-foreground" />
            </button>
            <div>
              <h1 className="text-sm sm:text-base font-semibold text-foreground truncate">
                {activeNavItem ? t(`navigation.${activeNavItem.key}`, activeNavItem.label) : t("navigation.dashboard")}
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                {getLocaleDateStr()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Real-time Notification Bell */}
            <NotificationBell />

            {/* Quick Language Selector Pill */}
            <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-card/80 px-2.5 py-1.5 shadow-2xs">
              <Globe className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <select
                value={i18n.language || "en"}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                aria-label="Language selector"
                className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer pr-1"
              >
                <option value="en" className="bg-card text-foreground">EN</option>
                <option value="hi" className="bg-card text-foreground">हिन्दी</option>
                <option value="te" className="bg-card text-foreground">తెలుగు</option>
              </select>
            </div>

            {/* Top Right Profile & Sign Out Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 rounded-2xl border border-border bg-card/80 px-3 py-1.5 hover:bg-accent transition-colors shadow-2xs cursor-pointer">
                  <Avatar className="h-7 w-7 border border-border">
                    <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden sm:block leading-tight">
                    <p className="text-xs font-semibold text-foreground">{user?.name || "User"}</p>
                    <p className="text-[10px] text-muted-foreground capitalize leading-none mt-0.5">{user?.role || "Staff"}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 mt-2 z-[9999] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-2 opacity-100">
                <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 rounded-xl mb-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{user?.name || "User"}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{user?.email || "user@innkeeper.com"}</p>
                  <Badge variant="secondary" className="mt-2 text-[10px] font-semibold uppercase tracking-wider bg-slate-200/70 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                    {user?.role || "Staff"}
                  </Badge>
                </div>
                <DropdownMenuItem
                  onClick={() => setIsSettingsOpen(true)}
                  className="cursor-pointer mt-1 rounded-xl py-2 px-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800"
                >
                  <Settings className="mr-2.5 h-4 w-4 text-sky-600 dark:text-sky-400" />
                  <span>{t("settings.title")}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-800" />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer rounded-xl py-2 px-3 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 focus:bg-rose-50 dark:focus:bg-rose-950/50"
                >
                  <LogOut className="mr-2.5 h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <span>{t("navigation.signOut")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-3.5 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
