import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAuthContext } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { LogOut, Settings, User, Moon, Sun, Building2, Globe } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user, logout } = useAuthContext();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();

  const handleSignOut = async () => {
    onClose();
    logout();
    toast.info("Signed out successfully.");
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    i18n.changeLanguage(newLang);
    toast.success(`Language switched to ${newLang === 'hi' ? 'Hindi (हिन्दी)' : newLang === 'te' ? 'Telugu (తెలుగు)' : 'English'}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md sm:max-w-lg rounded-3xl p-6 shadow-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 z-[9999] opacity-100">
        <DialogHeader className="pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Settings className="h-5 w-5 text-[#8B6748]" />
            {t("settings.title")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t("settings.subtitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-3">
          {/* User Account Details */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <User className="h-4 w-4 text-[#8B6748]" />
              {t("settings.accountProfile")}
            </h3>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-accent/40 border">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11 border border-border">
                  <AvatarFallback className="text-sm font-bold bg-primary text-primary-foreground">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{user?.name || "Motel Staff"}</p>
                    <Badge variant="secondary" className="capitalize text-[10px] px-2 py-0">
                      {user?.role || "Staff"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{user?.email || "staff@innkeeper.com"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Language Selection */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-emerald-600" />
              {t("settings.language")}
            </h3>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-accent/40 border">
              <div>
                <p className="text-sm font-medium">{t("settings.language")}</p>
                <p className="text-xs text-muted-foreground">{t("settings.languageSub")}</p>
              </div>
              <select
                value={i18n.language || "en"}
                onChange={handleLanguageChange}
                className="bg-card border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="te">తెలుగు (Telugu)</option>
              </select>
            </div>
          </div>

          {/* Appearance Settings */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              {theme === "dark" ? <Moon className="h-4 w-4 text-amber-500" /> : <Sun className="h-4 w-4 text-amber-500" />}
              {t("settings.appearance")}
            </h3>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-accent/40 border">
              <div>
                <p className="text-sm font-medium">{t("settings.darkMode")}</p>
                <p className="text-xs text-muted-foreground">{t("settings.darkModeSub")}</p>
              </div>
              <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
            </div>
          </div>

          {/* Property Info */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-emerald-600" />
              {t("settings.propertyInfo")}
            </h3>
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-accent/40 border text-xs">
              <div>
                <p className="text-muted-foreground">{t("settings.property")}</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">InnKeeper Grand Motel</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("settings.timezone")}</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">Asia/Kolkata (IST)</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("settings.currency")}</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">INR (₹)</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("settings.version")}</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">v2.4.0 (Stable)</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Prominent Sign Out Section */}
          <div className="rounded-2xl border border-rose-200 bg-rose-50/60 dark:bg-rose-950/20 p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-rose-900 dark:text-rose-300">{t("settings.signOut")}</p>
              <p className="text-xs text-rose-700 dark:text-rose-400">{t("settings.signOutSub")}</p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleSignOut}
              className="rounded-xl font-semibold gap-2 shadow-sm bg-rose-600 hover:bg-rose-700 text-white"
            >
              <LogOut className="h-4 w-4" />
              {t("settings.signOutNow")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
