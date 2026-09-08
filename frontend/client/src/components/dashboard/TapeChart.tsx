import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bed } from "lucide-react";
import { useStore } from "@/lib/store";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface Room {
  id: number;
  number: string;
  name: string;
  type: string;
  floor: number;
  status: string;
  rate: number;
  capacity: number;
}

interface Reservation {
  id: number;
  guestId: number | null;
  roomId: number | null;
  checkIn: Date;
  checkOut: Date;
  status: string;
  totalCharges: number | null;
  notes: string | null;
}

interface Guest {
  id: number;
  firstName: string;
  lastName: string;
}

interface TapeChartProps {
  rooms: Room[];
  reservations: Reservation[];
  startDate: Date;
  days: number;
  guests: Guest[];
  onRoomClick: (data: { room: Room; guest?: Guest; reservation?: Reservation }) => void;
}

const statusColors: Record<string, string> = {
  confirmed: "#a855f7",
  checked_in: "#3b82f6",
  checked_out: "#10b981",
  cancelled: "#ef4444",
  no_show: "#6b7280",
};

import { useTranslation } from "react-i18next";

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

export default function TapeChart({ rooms, reservations, startDate, days, guests, onRoomClick }: TapeChartProps) {
  const { t } = useTranslation();
  const [draggedReservation, setDraggedReservation] = useState<Reservation | null>(null);
  const [dragOverRoom, setDragOverRoom] = useState<number | null>(null);
  const { updateRoomStatus } = useStore();

  const statusLabels: Record<string, string> = {
    confirmed: t("reservations.confirmed"),
    checked_in: t("reservations.checkedIn"),
    checked_out: t("reservations.checkedOut"),
    cancelled: t("reservations.cancelled"),
    no_show: "No Show",
  };

  const dateHeaders = useMemo(() => {
    const headers = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      headers.push({
        date: new Date(date),
        label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
        isToday: isSameDay(date, new Date()),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
      });
    }
    return headers;
  }, [startDate, days]);

  const roomBlocks = useMemo(() => {
    return rooms.map((room) => {
      const roomReservations = reservations.filter((r) => r.roomId === room.id);
      const blocks = roomReservations.map((res) => {
        const checkInDate = new Date(res.checkIn);
        const checkOutDate = new Date(res.checkOut);

        // Calculate start index relative to the visible date range
        const firstVisibleDate = new Date(startDate);
        firstVisibleDate.setHours(0, 0, 0, 0);

        let startIdx = 0;
        let span = 0;

        // Find the start index (clamped to visible range)
        const dayDiff = Math.floor((checkInDate.getTime() - firstVisibleDate.getTime()) / (1000 * 60 * 60 * 24));
        startIdx = Math.max(0, dayDiff);

        // Calculate span (clamped to visible range)
        const totalDays = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
        span = Math.min(days - startIdx, totalDays);

        if (startIdx >= days || span <= 0) return null;

        const guest = guests.find((g) => g.id === res.guestId);

        return {
          reservation: res,
          guest,
          startIdx,
          span: Math.max(1, span),
          color: statusColors[res.status] || "#3b82f6",
          label: `${guest ? `${guest.firstName[0]}${guest.lastName[0]}` : "?"} · ${statusLabels[res.status] || res.status}`,
        };
      }).filter(Boolean) as Array<{
        reservation: Reservation;
        guest?: Guest;
        startIdx: number;
        span: number;
        color: string;
        label: string;
      }>;

      return { room, blocks };
    });
  }, [rooms, reservations, guests, startDate, days]);

  const handleDragStart = useCallback((res: Reservation) => {
    setDraggedReservation(res);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedReservation(null);
    setDragOverRoom(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, roomId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverRoom(roomId);
  }, []);

  const reassignMutation = trpc.reservations.reassignRoom.useMutation();
  const utils = trpc.useUtils();

  const handleDrop = useCallback(async (roomId: number) => {
    if (draggedReservation) {
      try {
        await reassignMutation.mutateAsync({
          reservationId: draggedReservation.id,
          newRoomId: roomId,
          oldRoomId: draggedReservation.roomId ?? undefined,
        });
        updateRoomStatus(roomId, "occupied");
        // Invalidate to get fresh data
        utils.rooms.list.invalidate();
        utils.reservations.list.invalidate();
        toast.success(`Moved reservation to Room ${rooms.find(r => r.id === roomId)?.number}`);
      } catch {
        toast.error("Failed to reassign room");
      }
    }
    setDraggedReservation(null);
    setDragOverRoom(null);
  }, [draggedReservation, reassignMutation, updateRoomStatus, rooms, utils]);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-225">
        {/* Date Header */}
        <div className="sticky top-0 z-10 flex border-b border-slate-200/80 bg-white/90 backdrop-blur">
          <div className="flex w-20 shrink-0 items-center gap-1 border-r border-slate-200/80 p-2 text-xs font-medium text-slate-600">
            <Bed className="h-3.5 w-3.5" />
            Room
          </div>
          {dateHeaders.map((header, i) => (
            <div
              key={i}
              className={`min-w-12.5 flex-1 border-r border-slate-200/70 p-2 text-center text-xs ${
                header.isToday
                  ? "bg-primary/10 font-semibold"
                  : header.isWeekend
                  ? "bg-muted/30"
                  : ""
              }`}
            >
              <div className="text-muted-foreground text-[10px]">{header.dayName}</div>
              <div className={header.isToday ? "text-primary font-bold" : ""}>
                {header.label}
              </div>
            </div>
          ))}
        </div>

        {/* Room Rows */}
        <ScrollArea className="max-h-125">
          {roomBlocks.map(({ room, blocks }) => (
            <div
              key={room.id}
              className={`flex border-b border-slate-200/70 transition-colors ${
                dragOverRoom === room.id
                  ? "bg-[#F3EDE4]/80"
                  : "hover:bg-slate-50/70"
              }`}
              onDragOver={(e) => handleDragOver(e, room.id)}
              onDragLeave={() => setDragOverRoom(null)}
              onDrop={() => handleDrop(room.id)}
            >
              {/* Room Info */}
              <div className="flex w-20 shrink-0 items-center gap-1.5 border-r border-slate-200/70 p-2">
                <span className="text-xs font-semibold text-slate-900">{room.number}</span>
                <span className="truncate text-[9px] text-slate-500">
                  {room.type.charAt(0).toUpperCase()}{room.type.slice(1, 3)}
                </span>
              </div>

              {/* Timeline */}
              <div className="relative flex h-11 flex-1">
                {dateHeaders.map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 border-r border-slate-200/70 ${
                      dateHeaders[i].isWeekend ? "bg-muted/10" : ""
                    }`}
                  />
                ))}

                {/* Reservation Blocks */}
                {blocks.map((block, bi) => (
                  <motion.div
                    key={bi}
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: bi * 0.03, duration: 0.2, ease: "easeOut" }}
                    draggable
                    onDragStart={() => handleDragStart(block.reservation)}
                    onDragEnd={handleDragEnd}
                    onClick={() =>
                      onRoomClick({
                        room,
                        guest: block.guest,
                        reservation: block.reservation,
                      })
                    }
                    className="absolute top-1 bottom-1 z-10 flex cursor-pointer items-center overflow-hidden rounded-xl border border-white/40 shadow-sm transition-opacity hover:opacity-90"
                    style={{
                      left: `${(block.startIdx / days) * 100}%`,
                      width: `${(block.span / days) * 100}%`,
                      backgroundColor: block.color,
                    }}
                  >
                    <span className="text-[10px] font-medium text-white px-1.5 truncate">
                      {block.label}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>
    </div>
  );
}
