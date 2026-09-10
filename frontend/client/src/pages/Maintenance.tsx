import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Wrench, Plus, AlertTriangle, CheckCircle, Clock, Zap } from "lucide-react";
import confetti from "canvas-confetti";
import { DataTablePagination } from "@/components/ui/DataTablePagination";

function LiveStopwatch({ startTime, isPaused, accumulatedSeconds = 0 }: { startTime?: string | number; isPaused?: boolean; accumulatedSeconds?: number }) {
  const [seconds, setSeconds] = useState(accumulatedSeconds);

  useEffect(() => {
    if (isPaused) {
      setSeconds(accumulatedSeconds);
      return;
    }

    const startMs = startTime ? new Date(startTime).getTime() : Date.now();
    const updateTimer = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000)) + accumulatedSeconds;
      setSeconds(elapsed);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startTime, isPaused, accumulatedSeconds]);

  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  return <span className="font-mono text-sm font-bold text-amber-900 dark:text-amber-300">{mins}:{secs}</span>;
}

function fireConfettiBlast() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#38bdf8", "#0284c7", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"],
  });
}

function normalizeList(data: any) {
  if (Array.isArray(data)) return { items: data, total: data.length };
  if (data?.items) return data;
  return { items: [], total: 0 };
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  low:    { label: "Low",    color: "text-slate-500",  icon: Clock },
  normal: { label: "Normal", color: "text-[#8B6748]",   icon: Wrench },
  high:   { label: "High",   color: "text-amber-600",  icon: AlertTriangle },
  urgent: { label: "Urgent", color: "text-red-600",    icon: Zap },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open:        { label: "Open",        color: "text-red-700",    bg: "bg-red-50" },
  "in-progress": { label: "In Progress", color: "text-amber-700", bg: "bg-amber-50" },
  resolved:    { label: "Resolved",    color: "text-green-700",  bg: "bg-green-50" },
};

function getRoomForTicket(targetRoomId: any, allRooms: any[]) {
  if (targetRoomId == null) return null;
  const targetStr = String(targetRoomId).trim();
  return allRooms.find((r: any) =>
    String(r.id) === targetStr ||
    String(r.number) === targetStr ||
    String(r.room_number) === targetStr
  );
}

import { useTranslation } from "react-i18next";

export default function MaintenancePage() {
  const { t } = useTranslation();

  const getLocalizedIssue = (issue: string) => {
    if (!issue) return "";
    const match = issue.match(/^Room\s+(\S+)\s+reported\s+under\s+maintenance$/i);
    if (match) {
      return t("maintenance.autoIssuePattern", { number: match[1] });
    }
    return issue;
  };
  const storeRooms = useStore((state) => state.rooms);
  const updateRoomStatus = useStore((state) => state.updateRoomStatus);
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [dialogOpen, setDialogOpen] = useState(false);
  const qc = useQueryClient();

  const mainQ = useQuery({
    queryKey: ["maintenance", filterPriority, filterStatus, storeRooms],
    queryFn: async () => {
      const [{ data: mainData }, { data: roomsData }] = await Promise.all([
        apiClient.maintenance.list({ limit: 250 }),
        apiClient.rooms.list({ limit: 250 }),
      ]);
      const list = normalizeList(mainData).items;
      const apiRooms = normalizeList(roomsData).items;
      const allRooms = storeRooms.length > 0 ? storeRooms : apiRooms;

      // Maintenance tickets are the source of truth (works for both room-specific
      // and general/property tickets); resolved ones drop off the active view.
      const activeMaintList: any[] = list.filter((m: any) => m.status !== "resolved");

      // Also surface any room flagged 'maintenance' that has no matching ticket yet
      // (e.g. status changed outside this form) so the room isn't silently orphaned.
      allRooms.forEach((r: any) => {
        const roomStatus = r.status?.toLowerCase();
        if (roomStatus === "maintenance") {
          const hasTicket = activeMaintList.some((m: any) =>
            String(m.roomId) === String(r.id) ||
            String(m.roomId) === String(r.number) ||
            String(m.roomId) === String(r.room_number)
          );

          if (!hasTicket) {
            activeMaintList.push({
              id: `maint-${r.id}`,
              roomId: r.id,
              issue: `Room ${r.number || r.room_number} reported under maintenance`,
              priority: "high",
              status: "open",
              notes: "AC unit / hardware requires servicing and filter replacement.",
            });
          }
        }
      });

      let filtered = activeMaintList;

      if (filterPriority !== "all") filtered = filtered.filter((r: any) => r.priority === filterPriority);
      if (filterStatus !== "all") filtered = filtered.filter((r: any) => r.status === filterStatus);
      return filtered;
    },
  });

  const roomsQ = useQuery({
    queryKey: ["rooms-maint"],
    queryFn: async () => {
      const { data } = await apiClient.rooms.list({ limit: 250 });
      return normalizeList(data).items;
    },
  });

  const form = useForm({
    defaultValues: { roomId: "", issue: "", priority: "normal", status: "open", notes: "" },
  });

  const createM = useMutation({
    mutationFn: async (d: any) => {
      const roomId = d.roomId ? Number(d.roomId) : null;
      const result = await apiClient.maintenance.create({ ...d, roomId });
      if (roomId) {
        updateRoomStatus(roomId, "maintenance");
        await apiClient.rooms.update(String(roomId), { status: "maintenance", isAvailable: false }).catch(() => {});
      }
      return result;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["maintenance"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      apiClient.notifications.create({
        type: "maintenance",
        title: "Maintenance Issue Reported",
        message: `New repair ticket created: ${variables.issue || 'Facility issue'}`,
      }).then(() => qc.invalidateQueries({ queryKey: ["notifications"] })).catch(() => {});
      toast.success(t("maintenance.newTicket"));
      setDialogOpen(false);
      form.reset();
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || t("housekeeping.toastFailed")),
  });

  const updateM = useMutation({
    mutationFn: ({ id, data }: any) => apiClient.maintenance.update(id, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["maintenance"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      const newStatus = (variables.data?.status || "updated").toUpperCase();
      apiClient.notifications.create({
        type: "maintenance",
        title: "Maintenance Ticket Alert",
        message: `Ticket #${variables.id} status updated to ${newStatus}`,
      }).then(() => qc.invalidateQueries({ queryKey: ["notifications"] })).catch(() => {});
      toast.success(t("maintenance.toastTicketUpdated"));
    },
    onError: () => toast.error(t("maintenance.toastFailedUpdate")),
  });

  const items = mainQ.data ?? [];

  return (
    <div className="space-y-6">
      {/* Top Header Hub */}
      <div className="rounded-2xl bg-card border border-border p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-pink-500/10 text-pink-600 flex items-center justify-center font-bold">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t("maintenance.title")}</h1>
            <p className="text-xs text-muted-foreground">{t("maintenance.subtitle")}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><SelectValue placeholder={t("dashboard.allStatus")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("dashboard.allStatus")}</SelectItem>
              <SelectItem value="open">{t("maintenance.open").toUpperCase()}</SelectItem>
              <SelectItem value="in-progress">{t("maintenance.inProgress").toUpperCase()}</SelectItem>
              <SelectItem value="resolved">{t("maintenance.resolved").toUpperCase()}</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => { form.reset(); setDialogOpen(true); }} className="gap-2 bg-[#8B6748] hover:bg-[#7A5A3C] text-white font-bold rounded-xl shadow-md cursor-pointer">
            <Plus className="h-4 w-4" /> {t("maintenance.newTicket")}
          </Button>
        </div>
      </div>

      {/* Technician Ticket Cards Grid / Empty State */}
      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card/60 p-12 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8B6748]/10 text-[#8B6748]">
            <Wrench className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-foreground">{t("maintenance.noActiveTickets")}</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {t("maintenance.allRoomsOperational")}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {(itemsPerPage === 0 ? items : items.slice((page - 1) * itemsPerPage, page * itemsPerPage)).map((ticket: any) => {
            const roomObj = getRoomForTicket(ticket.roomId, roomsQ.data ?? []);
            const roomLabel = roomObj?.number || roomObj?.room_number || String(ticket.roomId || "1004");
            const priority = (ticket.priority || "MEDIUM").toUpperCase();
            const isUrgent = priority === "URGENT" || priority === "HIGH";

            return (
              <div key={ticket.id} className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-md flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-pink-600 bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20">
                          TKT-2026-00{ticket.id}
                        </span>
                        <span className="text-xs text-muted-foreground font-semibold">{t("roomDrawer.roomNumber", { number: roomLabel })}</span>
                      </div>
                      <h3 className="text-base font-extrabold text-foreground mt-2">{getLocalizedIssue(ticket.issue) || t("maintenance.placeholderIssue")}</h3>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                      isUrgent ? "bg-red-600 text-white" : "bg-[#8B6748] text-white"
                    }`}>
                      {priority}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-accent/40 text-xs text-muted-foreground leading-relaxed">
                    {(!ticket.notes || ticket.notes === "AC unit / hardware requires servicing and filter replacement.") ? t("maintenance.defaultNotes") : ticket.notes}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <div>
                      <span className="text-muted-foreground">{t("maintenance.reportedBy")} </span>
                      <span className="font-bold text-foreground">{t("maintenance.housekeeperStaff")}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-3 space-y-3">
                  {ticket.status === "in-progress" && (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-700 dark:text-amber-300">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping"></span> {t("maintenance.liveRepairTimer")}
                      </span>
                      <LiveStopwatch startTime={ticket.repairStartedAt} isPaused={false} accumulatedSeconds={ticket.accumulatedSeconds || 0} />
                    </div>
                  )}
                  {ticket.status === "paused" && (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-500/10 border border-slate-500/20 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-slate-500"></span> {t("maintenance.repairPaused")}
                      </span>
                      <LiveStopwatch startTime={ticket.repairStartedAt} isPaused={true} accumulatedSeconds={ticket.accumulatedSeconds || 0} />
                    </div>
                  )}

                  <div className="flex gap-2">
                    {ticket.status === "open" && (
                      <Button
                        onClick={() => {
                          if (typeof ticket.id === "string" && ticket.id.startsWith("maint-")) {
                            const numericRoomId = Number(ticket.id.replace("maint-", ""));
                            apiClient.maintenance.create({
                              roomId: numericRoomId,
                              issue: ticket.issue,
                              priority: "high",
                              status: "in-progress",
                              repairStartedAt: new Date().toISOString(),
                              accumulatedSeconds: 0,
                            }).then(() => {
                              qc.invalidateQueries({ queryKey: ["maintenance"] });
                              toast.success(t("maintenance.toastRepairStarted"));
                            });
                          } else {
                            updateM.mutate({
                              id: ticket.id,
                              data: { status: "in-progress", repairStartedAt: new Date().toISOString(), accumulatedSeconds: 0 },
                            });
                          }
                        }}
                        className="flex-1 bg-[#8B6748] hover:bg-[#7A5A3C] text-white font-bold rounded-xl shadow-md py-2.5"
                      >
                        ▶ {t("maintenance.startRepair")}
                      </Button>
                    )}

                    {(ticket.status === "in-progress" || ticket.status === "paused") && (
                      <Button
                        onClick={() => {
                          fireConfettiBlast();
                          if (typeof ticket.id === "string" && ticket.id.startsWith("maint-")) {
                            const numericRoomId = Number(ticket.id.replace("maint-", ""));
                            updateRoomStatus(numericRoomId, "vacant");
                            apiClient.rooms.update(String(numericRoomId), { status: "vacant", isAvailable: true })
                              .then(() => {
                                qc.invalidateQueries({ queryKey: ["rooms"] });
                                qc.invalidateQueries({ queryKey: ["maintenance"] });
                                toast.success(t("maintenance.toastRepairCompleted"));
                              });
                          } else {
                            updateM.mutate({ id: ticket.id, data: { status: "resolved" } });
                            if (ticket.roomId) {
                              updateRoomStatus(Number(ticket.roomId), "vacant");
                              apiClient.rooms.update(String(ticket.roomId), { status: "vacant", isAvailable: true }).then(() => {
                                qc.invalidateQueries({ queryKey: ["rooms"] });
                              });
                            }
                          }
                        }}
                        className="flex-1 bg-[#8B6748] hover:bg-[#7A5A3C] text-white font-bold rounded-xl shadow-md py-2.5"
                      >
                        ✓ {t("maintenance.completeRepair")}
                      </Button>
                    )}

                  </div>
                </div>
              </div>
            );
          })}
          </div>

          {/* Pagination Controls */}
          <DataTablePagination
            currentPage={page}
            totalPages={itemsPerPage === 0 ? 1 : Math.ceil(items.length / itemsPerPage) || 1}
            totalItems={items.length}
            pageSize={itemsPerPage}
            onPageChange={setPage}
            onPageSizeChange={setItemsPerPage}
            pageSizeOptions={[8, 16, 24, 0]}
            itemName="tickets"
          />
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-2xl font-bold text-slate-900">{t("maintenance.newTicket")}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(d => {
              if (!d.roomId || d.roomId === "none") {
                toast.error(t("maintenance.validationRoomLocation"));
                return;
              }
              if (!d.issue || !d.issue.trim()) {
                toast.error(t("maintenance.validationIssueRequired"));
                return;
              }
              if (d.issue.trim().length < 3) {
                toast.error(t("maintenance.validationIssueLength"));
                return;
              }
              const payload = {
                ...d,
                roomId: Number(d.roomId),
              };
              createM.mutate(payload);
            })} className="space-y-4 pt-2">
              <FormItem>
                <FormLabel className="font-semibold text-slate-800">{t("maintenance.roomLocation")}</FormLabel>
                <FormControl>
                  <Select value={form.watch("roomId") || "none"} onValueChange={v => form.setValue("roomId", v)}>
                    <SelectTrigger><SelectValue placeholder={t("maintenance.selectRoomOptional")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("maintenance.generalProperty")}</SelectItem>
                      {(roomsQ.data ?? []).map((r: any) => (
                        <SelectItem key={r.id} value={String(r.id)}>{t("roomDrawer.roomNumber", { number: r.number || r.room_number })}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
              </FormItem>
              <FormItem>
                <FormLabel className="font-semibold text-slate-800">{t("maintenance.issueDescription")}</FormLabel>
                <FormControl><Input placeholder={t("maintenance.placeholderIssue")} required {...form.register("issue")} /></FormControl>
              </FormItem>
              <div className="grid grid-cols-2 gap-4">
                <FormItem>
                  <FormLabel className="font-semibold text-slate-800">{t("maintenance.priority")}</FormLabel>
                  <FormControl>
                    <Select value={form.watch("priority")} onValueChange={v => form.setValue("priority", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{t("maintenance." + k)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
                <FormItem>
                  <FormLabel className="font-semibold text-slate-800">{t("maintenance.status")}</FormLabel>
                  <FormControl>
                    <Select value={form.watch("status")} onValueChange={v => form.setValue("status", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{t("maintenance." + (k === "in-progress" ? "inProgress" : k))}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              </div>
              <FormItem>
                <FormLabel className="font-semibold text-slate-800">{t("maintenance.additionalNotes")}</FormLabel>
                <FormControl><Input placeholder={t("maintenance.placeholderNotes")} {...form.register("notes")} /></FormControl>
              </FormItem>
              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" variant="outline" className="h-11 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium px-6 shadow-2xs" onClick={() => setDialogOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" className="h-11 rounded-2xl bg-[#8B6748] hover:bg-[#7A5A3C] text-white font-semibold px-6 shadow-md shadow-[#8B6748]/20" disabled={createM.isPending}>
                  {createM.isPending ? t("common.submitting") : t("maintenance.reportIssue")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
