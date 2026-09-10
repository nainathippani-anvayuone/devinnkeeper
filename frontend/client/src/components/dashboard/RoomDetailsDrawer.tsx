import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Bed,
  User,
  Calendar,
  DollarSign,
  Printer,
  LogIn,
  LogOut,
  X,
  Wifi,
  Users,
  Bath,
  Tv,
  CreditCard,
  CheckCircle2,
  Camera,
  Key,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Lock,
  ArrowRightLeft,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useLocation } from "wouter";
import { apiClient } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { Room, Guest, Reservation } from "@/lib/store";

interface RoomDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room | null;
  guest: Guest | null;
  reservation: Reservation | null;
}

const statusColors: Record<string, string> = {
  vacant: "bg-emerald-500",
  occupied: "bg-[#8B6748]",
  dirty: "bg-amber-500",
  maintenance: "bg-red-500",
  reserved: "bg-purple-500",
};

export default function RoomDetailsDrawer({ isOpen, onClose, room, guest, reservation }: RoomDetailsDrawerProps) {
  const { t } = useTranslation();
  const { updateRoomStatus } = useStore();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();

  const [activeStep, setActiveStep] = useState<"IDLE" | "BOOKING">("IDLE");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split("T")[0]);
  const [nights, setNights] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setActiveStep("IDLE");
      setGuestName("");
      setGuestPhone("");
      setGuestEmail("");
    }
  }, [isOpen]);

  const handleBookRoom = async () => {
    if (!room) return;
    if (!guestName.trim()) {
      toast.error("Validation Error: Please enter guest full name");
      return;
    }
    const cleanPhone = guestPhone.replace(/\D/g, "");
    if (!cleanPhone) {
      toast.error("Validation Error: Phone number is required");
      return;
    }
    if (cleanPhone.length !== 10) {
      toast.error("Validation Error: Phone number must be exactly 10 digits");
      return;
    }

    setIsSubmitting(true);
    try {
      const [firstName, ...rest] = guestName.trim().split(" ");
      const lastName = rest.join(" ") || "Guest";

      const guestRes = await apiClient.guests.create({
        firstName,
        lastName,
        phone: guestPhone || undefined,
        email: guestEmail || undefined,
      });
      const newGuestId = guestRes.data?.id;

      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + (parseInt(nights, 10) || 1));
      const totalCharges = (room.rate || 0) * (parseInt(nights, 10) || 1);

      await apiClient.reservations.create({
        guestId: newGuestId,
        firstName,
        lastName,
        phone: guestPhone || undefined,
        email: guestEmail || undefined,
        roomId: room.id,
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        status: "confirmed",
        totalCharges,
        paidAmount: 0,
        source: "Direct",
        notes: `Direct room booking from Dashboard Drawer`,
      });

      updateRoomStatus(room.id, "occupied");
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["reservations"] });
      qc.invalidateQueries({ queryKey: ["guests"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });

      toast.success(`Room ${room.number} booked successfully!`);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to book room");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isVacant = room?.status === "vacant";
  const isDirty = room?.status === "dirty";
  const isMaintenance = room?.status === "maintenance";

  const amenities = [
    { icon: Wifi, label: "WiFi" },
    { icon: Tv, label: "Smart TV" },
    { icon: Bath, label: "Attached Bath" },
    { icon: Users, label: t("roomDrawer.guestsCount", { count: room?.capacity || 2 }) },
  ];

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="text-xl font-bold flex items-center gap-2">
                {t("roomDrawer.roomNumber", { number: room?.number })}
              </DrawerTitle>
              <DrawerDescription className="text-sm">
                {room?.type ? room.type.charAt(0).toUpperCase() + room.type.slice(1) : "Standard"} · {t("dashboard.floor", { floor: room?.floor })}
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>

          {room && (
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${statusColors[room.status] || "bg-gray-500"}`} />
                <Badge variant="secondary" className="capitalize">
                  {t(`dashboard.${room.status}`, room.status)}
                </Badge>
              </div>
              <span className="text-sm font-semibold">₹{room.rate}{t("roomDrawer.perNight")}</span>
            </div>
          )}
        </DrawerHeader>

        <Separator />

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-6">

            {/* STATUS NOTICES */}
            {isDirty && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-900 shadow-sm space-y-2">
                <div className="flex items-center gap-2.5 font-bold text-base text-amber-800">
                  <Sparkles className="h-5 w-5 text-amber-600 shrink-0" />
                  {t("roomDrawer.dirtyNoticeTitle")}
                </div>
                <p className="text-sm font-medium text-amber-700">
                  {t("roomDrawer.dirtyNoticeBody")}
                </p>
              </div>
            )}

            {isMaintenance && (
              <div className="rounded-2xl border border-red-300 bg-red-50 p-5 text-red-900 shadow-sm space-y-2">
                <div className="flex items-center gap-2.5 font-bold text-base text-red-800">
                  <Lock className="h-5 w-5 text-red-600 shrink-0" />
                  {t("roomDrawer.maintenanceNoticeTitle")}
                </div>
                <p className="text-sm font-medium text-red-700">
                  {t("roomDrawer.maintenanceNoticeBody")}
                </p>
              </div>
            )}

            {/* BOOKING FORM */}
            {activeStep === "BOOKING" && isVacant && (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-[#F3EDE4] border border-[#C4A882] p-3">
                  <div className="flex items-center gap-2 text-[#3F352D] text-sm font-semibold">
                    <Calendar className="h-5 w-5 text-[#8B6748]" /> {t("roomDrawer.bookRoomTitle", { number: room?.number })}
                  </div>
                  <Badge variant="outline" className="bg-white">{t("roomDrawer.directReservation")}</Badge>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1 block">{t("roomDrawer.guestFullName")}</label>
                    <Input
                      placeholder="e.g. John Doe"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-700 mb-1 block">{t("roomDrawer.phone10Digits")}</label>
                      <Input
                        placeholder="e.g. 9876543210"
                        maxLength={10}
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 mb-1 block">{t("roomDrawer.emailAddress")}</label>
                      <Input
                        placeholder="john@example.com"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-700 mb-1 block">{t("roomDrawer.checkInDate")}</label>
                      <Input
                        type="date"
                        value={checkInDate}
                        onChange={(e) => setCheckInDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 mb-1 block">{t("roomDrawer.numberOfNights")}</label>
                      <Input
                        type="number"
                        min="1"
                        value={nights}
                        onChange={(e) => setNights(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-100 border text-xs space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>{t("roomDrawer.ratePerNight")}</span>
                      <span className="font-semibold">₹{room?.rate}</span>
                    </div>
                    <div className="flex justify-between text-slate-700 font-bold border-t pt-1 mt-1">
                      <span>{t("roomDrawer.totalCharges")}</span>
                      <span className="text-[#8B6748]">₹{(room?.rate || 0) * (parseInt(nights, 10) || 1)}</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleBookRoom}
                    disabled={isSubmitting}
                    className="w-full bg-[#8B6748] hover:bg-[#7A5A3C] text-white gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" /> {t("roomDrawer.confirmAndBook")}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* DEFAULT ROOM OVERVIEW VIEW */}
            {activeStep === "IDLE" && (
              <>
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Bed className="h-4 w-4 text-[#8B6748]" />
                    {t("roomDrawer.roomOverview")}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-accent/50">
                      <p className="text-xs text-muted-foreground">{t("roomDrawer.type")}</p>
                      <p className="text-sm font-medium capitalize">{room?.type}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-accent/50">
                      <p className="text-xs text-muted-foreground">{t("roomDrawer.floor")}</p>
                      <p className="text-sm font-medium">{room?.floor}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-accent/50">
                      <p className="text-xs text-muted-foreground">{t("roomDrawer.capacity")}</p>
                      <p className="text-sm font-medium">{t("roomDrawer.guestsCount", { count: room?.capacity })}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-accent/50">
                      <p className="text-xs text-muted-foreground">{t("roomDrawer.rate")}</p>
                      <p className="text-sm font-medium">₹{room?.rate}{t("roomDrawer.perNight")}</p>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-3">
                    {amenities.map((a, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <a.icon className="h-3.5 w-3.5" />
                        {a.label}
                      </div>
                    ))}
                  </div>
                </div>

                {guest && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <User className="h-4 w-4 text-emerald-600" />
                        {t("roomDrawer.guestProfile")}
                      </h3>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{guest.firstName} {guest.lastName}</p>
                          <p className="text-xs text-muted-foreground">{guest.email || "No email"} · {guest.phone || "No phone"}</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

          </div>
        </ScrollArea>

        <Separator />

        <DrawerFooter className="pt-4">
          {activeStep === "IDLE" ? (
            <div className="flex items-center gap-3">
              {isVacant && (
                <Button
                  onClick={() => setActiveStep("BOOKING")}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#8B6748] hover:bg-[#7A5A3C] text-white py-2.5 font-semibold text-sm rounded-xl shadow-md"
                >
                  <Calendar className="h-4 w-4" /> {t("roomDrawer.bookThisRoom")}
                </Button>
              )}

              {room?.status === "occupied" && (
                <Button
                  onClick={async () => {
                    if (!room) return;
                    setIsSubmitting(true);
                    try {
                      if (reservation) {
                        await apiClient.reservations.update(String(reservation.id), { status: "checked_out" });
                      }
                      await apiClient.rooms.update(String(room.id), { status: "dirty", isAvailable: true });
                      
                      // Auto-create housekeeping task
                      await apiClient.housekeeping.create({
                        roomId: room.id,
                        status: "pending",
                        assignedTo: "Maria Rodriguez",
                        notes: "Guest Checked Out - Express Checkout",
                      }).catch(() => {});

                      // Emit live notification
                      await apiClient.notifications.create({
                        type: "housekeeping",
                        title: "Guest Checked Out",
                        message: `Room #${room.number} checked out. Room added to Housekeeping list for turnaround cleaning.`,
                      }).catch(() => {});

                      updateRoomStatus(room.id, "dirty");
                      qc.invalidateQueries({ queryKey: ["rooms"] });
                      qc.invalidateQueries({ queryKey: ["reservations"] });
                      qc.invalidateQueries({ queryKey: ["housekeeping"] });
                      qc.invalidateQueries({ queryKey: ["notifications"] });
                      qc.invalidateQueries({ queryKey: ["dashboard"] });
                      toast.success(`Check-out complete! Room ${room.number} is now marked as Dirty and sent to Housekeeping.`);
                      onClose();
                    } catch (err: any) {
                      toast.error("Failed to check out");
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md py-2.5"
                >
                  <ArrowRightLeft className="h-4 w-4" /> {t("roomDrawer.checkOutGuest")}
                </Button>
              )}

              <Button variant="outline" onClick={onClose} className="px-5 rounded-xl">
                {t("common.close")}
              </Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setActiveStep("IDLE")} className="w-full text-slate-500">
              {t("roomDrawer.cancelReturn")}
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
