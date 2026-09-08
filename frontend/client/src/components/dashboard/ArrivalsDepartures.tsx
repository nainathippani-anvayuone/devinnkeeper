import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { UserPlus, LogOut, Calendar, Loader2, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface Room {
  id: number;
  number: string;
  name: string;
  type: string;
  status: string;
}

interface Reservation {
  id: number;
  guestId: number | null;
  roomId: number | null;
  checkIn: Date;
  checkOut: Date;
  status: string;
  totalCharges: number | null;
}

interface Guest {
  id: number;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
}

interface ArrivalsDeparturesProps {
  rooms: Room[];
  reservations: Reservation[];
  guests: Guest[];
}

export default function ArrivalsDepartures({ rooms, reservations, guests }: ArrivalsDeparturesProps) {
  const { t } = useTranslation();
  const { updateRoomStatus, setSelectedRoom } = useStore();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const checkOutMutation = useMutation({
    mutationFn: async (res: Reservation) => {
      await apiClient.reservations.update(String(res.id), { status: "checked_out" });
      if (res.roomId) {
        await apiClient.rooms.update(String(res.roomId), { status: "dirty", isAvailable: true });
        await apiClient.housekeeping.create({
          roomId: res.roomId,
          status: "pending",
          assignedTo: "Maria Rodriguez",
          notes: "Guest Checked Out - Express Checkout",
        }).catch(() => {});
      }
      return res;
    },
  });

  // Dynamic currentDate hook that updates live when the day changes
  const [currentDateStr, setCurrentDateStr] = useState<string>(() => new Date().toDateString());

  useEffect(() => {
    // Check every minute if the date has changed to a new day
    const interval = setInterval(() => {
      const nowStr = new Date().toDateString();
      if (nowStr !== currentDateStr) {
        setCurrentDateStr(nowStr);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [currentDateStr]);

  const todayArrivals = useMemo(() => {
    const today = new Date(currentDateStr);
    today.setHours(0, 0, 0, 0);

    return reservations.filter((r) => {
      const status = (r.status || '').toLowerCase();
      // An arrival is a guest expected today who has NOT checked in yet
      if (status !== "confirmed") return false;

      const checkInDate = new Date(r.checkIn);
      checkInDate.setHours(0, 0, 0, 0);
      return checkInDate.getTime() === today.getTime();
    });
  }, [reservations, currentDateStr]);

  const todayDepartures = useMemo(() => {
    const today = new Date(currentDateStr);
    today.setHours(0, 0, 0, 0);

    return reservations.filter((r) => {
      const status = (r.status || '').toLowerCase();
      if (status !== "checked_in") return false;

      const checkOutDate = new Date(r.checkOut);
      checkOutDate.setHours(0, 0, 0, 0);
      return checkOutDate.getTime() === today.getTime();
    });
  }, [reservations, currentDateStr]);

  const getGuest = (guestId: number | null) => {
    if (!guestId) return null;
    return guests.find((g) => g.id === guestId);
  };

  const getRoom = (roomId: number | null) => {
    if (!roomId) return null;
    return rooms.find((r) => r.id === roomId);
  };

  const handleGoToCheckIn = () => {
    // Real check-in requires ID verification + payment, so route staff to the
    // dedicated Check-In & Keys wizard rather than completing it silently here.
    setLocation("/checkin");
  };

  const handleCheckOut = async (res: Reservation) => {
    if (!res.roomId) return;
    try {
      await checkOutMutation.mutateAsync(res);
      const room = getRoom(res.roomId);
      if (room) updateRoomStatus(room.id, "dirty");
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["reservations"] });
      qc.invalidateQueries({ queryKey: ["housekeeping"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`Checked out: ${getGuest(res.guestId)?.firstName || "Guest"}`);
    } catch {
      toast.error("Failed to check out");
    }
  };

  const handleRowClick = (res: Reservation) => {
    const guest = getGuest(res.guestId);
    const room = getRoom(res.roomId);
    if (room) {
      setSelectedRoom({ room: room as any, guest: (guest || undefined) as any, reservation: res as any });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
              <UserPlus className="h-4 w-4" />
            </div>
            {t("dashboard.todaysArrivals")}
            <Badge variant="secondary" className="ml-auto text-xs">
              {todayArrivals.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {todayArrivals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 py-6 text-center text-sm text-muted-foreground">
              {t("dashboard.noArrivalsToday")}
            </div>
          ) : (
            todayArrivals.map((res, i) => {
              const guest = getGuest(res.guestId);
              const room = getRoom(res.roomId);
              return (
                  <motion.div
                    key={res.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex flex-col min-[420px]:flex-row min-[1536px]:flex-col min-[1800px]:flex-row sm:items-center justify-between gap-2.5 rounded-2xl border border-border/80 bg-card/90 p-3 transition-colors hover:bg-accent/40 shadow-2xs"
                    onClick={() => handleRowClick(res)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {guest ? `${guest.firstName} ${guest.lastName}` : "Guest"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {t("roomDrawer.roomNumber", { number: room?.number || "TBD" })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs shrink-0 self-start min-[420px]:self-auto min-[1536px]:self-start min-[1800px]:self-auto cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGoToCheckIn();
                      }}
                    >
                      <UserPlus className="h-3 w-3 mr-1" />
                      {t("checkin.title", "Check In")}
                    </Button>
                  </motion.div>
                );
              })
            )}
        </CardContent>
      </Card>

      <Separator />

      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
              <LogOut className="h-4 w-4" />
            </div>
            {t("dashboard.todaysDepartures")}
            <Badge variant="secondary" className="ml-auto text-xs">
              {todayDepartures.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {todayDepartures.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 py-6 text-center text-sm text-muted-foreground">
              {t("dashboard.noDeparturesToday")}
            </div>
          ) : (
            todayDepartures.map((res, i) => {
              const guest = getGuest(res.guestId);
              const room = getRoom(res.roomId);
              return (
                  <motion.div
                    key={res.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex flex-col min-[420px]:flex-row min-[1536px]:flex-col min-[1800px]:flex-row sm:items-center justify-between gap-2.5 rounded-2xl border border-border/80 bg-card/90 p-3 transition-colors hover:bg-accent/40 shadow-2xs"
                    onClick={() => handleRowClick(res)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {guest ? `${guest.firstName} ${guest.lastName}` : "Guest"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {t("roomDrawer.roomNumber", { number: room?.number || "TBD" })} · {t("reservations.checkedOut")}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs shrink-0 self-start min-[420px]:self-auto min-[1536px]:self-start min-[1800px]:self-auto cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCheckOut(res);
                      }}
                      disabled={checkOutMutation.isPending}
                    >
                      {checkOutMutation.isPending ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <LogOut className="h-3 w-3 mr-1" />
                      )}
                      {t("reservations.checkedOut")}
                    </Button>
                  </motion.div>
                );
              })
            )}
        </CardContent>
      </Card>
    </div>
  );
}
