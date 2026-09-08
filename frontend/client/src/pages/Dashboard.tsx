import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bed,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Bell,
  BellOff,
  Sparkles,
  Grid2x2,
  X,
  ArrowRightLeft,
} from "lucide-react";
import MetricsDashboard from "@/components/dashboard/MetricsDashboard";
import RoomStatusBoard from "@/components/dashboard/RoomStatusBoard";
import TapeChart from "@/components/dashboard/TapeChart";
import ArrivalsDepartures from "@/components/dashboard/ArrivalsDepartures";
import NotificationCenter from "@/components/dashboard/NotificationCenter";
import RoomDetailsDrawer from "@/components/dashboard/RoomDetailsDrawer";

import Module5Widgets from "@/components/dashboard/Module5Widgets";
import { useTheme } from "@/contexts/ThemeContext";
import { Skeleton } from "@/components/ui/skeleton";

import { useTranslation } from "react-i18next";

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const {
    rooms, setRooms,
    filterType, setFilterType,
    filterFloor, setFilterFloor,
    filterStatus, setFilterStatus,
    searchQuery, setSearchQuery,
    selectedRoom, setSelectedRoom,
    tapeChartStartDate, setTapeChartStartDate,
    reservations, setReservations,
    guests, setGuests,
    notifications, setNotifications,
    unreadCount, setUnreadCount,
    showAIAssistant,
    showAIPrediction,
    showAIInsights,
    showHeatmap,
  } = useStore();

  const { theme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch data via REST API
  const [isLoading, setIsLoading] = useState(false);

  const fetchAll = useCallback(async (isInitial = false) => {
    if (isInitial) setIsLoading(true);
    try {
      const [roomsResp, reservationsResp, guestsResp, notificationsResp] = await Promise.all([
        apiClient.rooms.list({ limit: 250 }),
        apiClient.reservations.list(),
        apiClient.guests.list(),
        apiClient.notifications.list(),
      ]);

      const roomsData = roomsResp?.data?.items ?? roomsResp?.data ?? [];
      const reservationsData = reservationsResp?.data?.items ?? reservationsResp?.data ?? [];
      const guestsData = guestsResp?.data?.items ?? guestsResp?.data ?? [];
      const notificationsData = notificationsResp?.data?.items ?? notificationsResp?.data ?? [];

      setRooms(roomsData as any);
      setReservations(reservationsData as any);
      setGuests(guestsData as any);
      setNotifications(notificationsData as any);
      setUnreadCount((notificationsData as any[]).filter((n: any) => !n.isRead).length || 0);
    } catch (e) {
      console.warn("Failed to fetch dashboard data", e);
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, [setRooms, setReservations, setGuests, setNotifications, setUnreadCount]);

  useEffect(() => {
    fetchAll(true);
    const interval = setInterval(() => fetchAll(false), 15000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Extract available floors and types dynamically from rooms
  const availableFloors = useMemo(() => {
    const floors = Array.from(new Set(rooms.map((r: any) => Number(r.floor))))
      .filter((f) => !isNaN(f))
      .sort((a, b) => a - b);
    return floors.length > 0 ? floors : [1, 2, 3, 4];
  }, [rooms]);

  const availableTypes = useMemo(() => {
    const types = Array.from(new Set(rooms.map((r: any) => r.type)))
      .filter((t): t is string => Boolean(t))
      .sort();
    return types.length > 0 ? types : ["Standard", "Deluxe", "Suite", "Premium", "Family"];
  }, [rooms]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    const list = rooms.filter((room: any) => {
      if (filterType !== "all" && String(room.type || "").toLowerCase() !== String(filterType).toLowerCase()) return false;
      if (filterFloor !== null && Number(room.floor) !== Number(filterFloor)) return false;
      if (filterStatus !== "all" && String(room.status || "").toLowerCase() !== String(filterStatus).toLowerCase()) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const guest = guests.find((g: any) => {
          const res = reservations.find((r: any) => r.roomId === room.id && r.guestId === g.id);
          return res;
        });
        const matchesName = `${room.number} ${room.name}`.toLowerCase().includes(q);
        const matchesGuest = guest ?
          `${(guest as any).firstName} ${(guest as any).lastName}`.toLowerCase().includes(q) :
          false;
        return matchesName || matchesGuest;
      }
      return true;
    });

    return list.sort((a: any, b: any) => {
      const floorA = Number(a.floor) || 0;
      const floorB = Number(b.floor) || 0;
      if (floorA !== floorB) return floorA - floorB;
      return String(a.number).localeCompare(String(b.number), undefined, { numeric: true });
    });
  }, [rooms, filterType, filterFloor, filterStatus, searchQuery, guests, reservations]);

  const navigateTapeChart = useCallback((direction: number) => {
    const newDate = new Date(tapeChartStartDate);
    newDate.setDate(newDate.getDate() + direction);
    setTapeChartStartDate(newDate);
  }, [tapeChartStartDate, setTapeChartStartDate]);

  const statusColors: Record<string, string> = {
    vacant: "bg-emerald-500",
    occupied: "bg-blue-500",
    dirty: "bg-amber-500",
    maintenance: "bg-red-500",
    reserved: "bg-purple-500",
  };

  const statusLabels: Record<string, string> = {
    vacant: t("dashboard.vacant"),
    occupied: t("dashboard.occupied"),
    dirty: t("dashboard.dirty"),
    maintenance: t("dashboard.maintenance"),
    reserved: t("dashboard.reserved"),
  };

  const getDashboardLocaleDate = () => {
    const currentLang = i18n.language || "en";
    const localeMap: Record<string, string> = { hi: "hi-IN", te: "te-IN", en: "en-US" };
    try {
      return new Date().toLocaleDateString(localeMap[currentLang] || "en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (e) {
      return new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200/80 bg-white/75 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-sky-700">
              <Sparkles className="h-4 w-4" />
              {t("dashboard.subtitle")}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t("dashboard.title")}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {getDashboardLocaleDate()}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
          <TabsTrigger value="overview">{t("dashboard.overview")}</TabsTrigger>
          <TabsTrigger value="tape-chart">{t("dashboard.tapeChart")}</TabsTrigger>
          <TabsTrigger value="rooms">{t("dashboard.rooms")}</TabsTrigger>
          <TabsTrigger value="arrivals">{t("dashboard.arrivals")}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-32 rounded-[1.5rem]" />
                ))}
              </div>
              <Skeleton className="h-50 rounded-[1.5rem]" />
              <Skeleton className="h-50 rounded-[1.5rem]" />
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-40 rounded-[1.5rem]" />
                ))}
              </div>
              <Skeleton className="h-75 rounded-[1.5rem]" />
            </div>
          ) : (
            <>
          {/* Metrics */}
          <MetricsDashboard rooms={filteredRooms} reservations={reservations} />

          {/* AI Panels Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
          </div>

          {/* AI Room Assignment */}
          

          {/* Module 5 widgets */}
          <Module5Widgets />

          {/* Room Status Board & Right-side Arrivals/Departures */}
          <div className="grid grid-cols-1 2xl:grid-cols-4 gap-6">
            <div className="2xl:col-span-3 min-w-0">
              <RoomStatusBoard
                rooms={filteredRooms as any}
                onRoomClick={(data: any) => setSelectedRoom(data as any)}
              />
            </div>
            <div className="2xl:col-span-1 min-w-0 space-y-4">
              <ArrivalsDepartures rooms={rooms as any} reservations={reservations as any} guests={guests as any} />
            </div>
          </div>
            </>
          )}
        </TabsContent>

        {/* Tape Chart Tab */}
        <TabsContent value="tape-chart" className="mt-6">
          <Card className="overflow-hidden border-slate-200/80 bg-white/80 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <Calendar className="h-5 w-5 text-sky-600" />
                    {t("dashboard.tapeChart")}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => navigateTapeChart(-7)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="min-w-50 text-center text-sm font-medium">
                      {tapeChartStartDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {" — "}
                      {new Date(tapeChartStartDate.getTime() + 13 * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <Button variant="outline" size="icon" onClick={() => navigateTapeChart(7)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setTapeChartStartDate(new Date())}>
                      {t("dashboard.today")}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {Object.entries(statusLabels).map(([status, label]) => (
                    <div key={status} className="flex items-center gap-1.5">
                      <div className={`h-2.5 w-2.5 rounded-full ${statusColors[status]}`} />
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <TapeChart
                rooms={filteredRooms as any}
                reservations={reservations as any}
                startDate={tapeChartStartDate}
                days={14}
                guests={guests as any}
                onRoomClick={(data: any) => setSelectedRoom(data as any)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rooms Tab */}
        <TabsContent value="rooms" className="space-y-6 mt-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3 sm:gap-4">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("dashboard.searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 w-full"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
                  <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                    <SelectTrigger className="w-full sm:w-36 md:w-40 h-10">
                      <SelectValue placeholder={t("dashboard.allTypes")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("dashboard.allTypes")}</SelectItem>
                      {availableTypes.map((type) => (
                        <SelectItem key={type} value={type} className="capitalize">
                          {t(`dashboard.${type.toLowerCase()}`, type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={String(filterFloor ?? "all")}
                    onValueChange={(v) => setFilterFloor(v === "all" ? null : Number(v))}
                  >
                    <SelectTrigger className="w-full sm:w-32 md:w-36 h-10">
                      <SelectValue placeholder={t("dashboard.allFloors")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("dashboard.allFloors")}</SelectItem>
                      {availableFloors.map((floorNum) => (
                        <SelectItem key={floorNum} value={String(floorNum)}>
                          {t("dashboard.floor", { floor: floorNum })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                    <SelectTrigger className="w-full sm:w-36 md:w-40 h-10">
                      <SelectValue placeholder={t("dashboard.allStatus")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("dashboard.allStatus")}</SelectItem>
                      <SelectItem value="vacant">{t("dashboard.vacant")}</SelectItem>
                      <SelectItem value="occupied">{t("dashboard.occupied")}</SelectItem>
                      <SelectItem value="dirty">{t("dashboard.dirty")}</SelectItem>
                      <SelectItem value="maintenance">{t("dashboard.maintenance")}</SelectItem>
                      <SelectItem value="reserved">{t("dashboard.reserved")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search Results Summary */}
          {searchQuery && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Search className="h-4 w-4" />
              <span>Showing {filteredRooms.length} result{filteredRooms.length !== 1 ? "s" : ""} for "{searchQuery}"</span>
              {filteredRooms.length === 0 && (
                <span className="text-destructive">— No rooms or guests match your search</span>
              )}
            </div>
          )}

          {/* Room Grid */}
          <RoomStatusBoard
            rooms={filteredRooms as any}
            onRoomClick={(data: any) => setSelectedRoom(data as any)}
          />
        </TabsContent>

        {/* Arrivals & Departures Tab */}
        <TabsContent value="arrivals" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ArrivalsDepartures rooms={rooms as any} reservations={reservations as any} guests={guests as any} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Room Details Drawer */}
      <RoomDetailsDrawer
        isOpen={!!selectedRoom}
        onClose={() => setSelectedRoom(null)}
        room={selectedRoom?.room ?? null}
        guest={selectedRoom?.guest ?? null}
        reservation={selectedRoom?.reservation ?? null}
      />

      {/* AI Assistant */}
     
    </div>
  );
}
