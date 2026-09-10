import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { BedDouble, IndianRupee, Car, CreditCard } from "lucide-react";
import { useTranslation } from "react-i18next";

function normalizeList(data: any) {
  if (Array.isArray(data)) return { items: data, total: data.length };
  if (data?.items) return data;
  return { items: [], total: 0 };
}

export default function Module5Widgets() {
  const { t } = useTranslation();
  const vehiclesQ = useQuery({
    queryKey: ["module5", "vehicles", "summary"],
    queryFn: async () => {
      const { data } = await apiClient.vehicles.list({ limit: 100 });
      return normalizeList(data);
    },
  });

  const paymentsQ = useQuery({
    queryKey: ["module5", "payments", "summary"],
    queryFn: async () => {
      const { data } = await apiClient.payments.list({ limit: 200 });
      return normalizeList(data);
    },
  });

  const roomsQ = useQuery({
    queryKey: ["module5", "rooms", "summary"],
    queryFn: async () => {
      const { data } = await apiClient.rooms.list({ limit: 250 });
      return normalizeList(data);
    },
  });

  const occupancyRate = useMemo(() => {
    const rooms = roomsQ.data?.items ?? [];
    if (!rooms.length) return null;
    const occupied = rooms.filter((r: any) => r.status === "occupied").length;
    return Math.round((occupied / rooms.length) * 100);
  }, [roomsQ.data]);

  const todayRevenue = useMemo(() => {
    const payments = paymentsQ.data?.items ?? [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return payments
      .filter((p: any) => p.paymentStatus === "Paid" && new Date(p.createdAt) >= today)
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  }, [paymentsQ.data]);

  const pendingPayments = useMemo(() => {
    const payments = paymentsQ.data?.items ?? [];
    return payments.filter((p: any) => p.paymentStatus === "Pending").reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  }, [paymentsQ.data]);

  const vehicleCount = vehiclesQ.data?.items?.length ?? vehiclesQ.data?.total ?? 0;

  const widgets = [
    {
      title: t("dashboard.occupancy"),
      value: roomsQ.isLoading ? null : occupancyRate !== null ? `${occupancyRate}%` : "—",
      subtitle: t("dashboard.occupancyDetail", {
        occupied: (roomsQ.data?.items ?? []).filter((r: any) => r.status === "occupied").length,
        total: roomsQ.data?.items?.length ?? 0,
      }),
      icon: BedDouble,
      color: "text-[#8B6748]",
      bg: "bg-[#F3EDE4]",
      loading: roomsQ.isLoading,
    },
    {
      title: t("dashboard.todayRevenue"),
      value: paymentsQ.isLoading ? null : `₹${todayRevenue.toLocaleString()}`,
      subtitle: t("dashboard.paymentsCollectedToday"),
      icon: IndianRupee,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      loading: paymentsQ.isLoading,
    },
    {
      title: t("dashboard.parkingOccupancy"),
      value: vehiclesQ.isLoading ? null : String(vehicleCount),
      subtitle: t("dashboard.vehiclesRegistered"),
      icon: Car,
      color: "text-violet-600",
      bg: "bg-violet-50",
      loading: vehiclesQ.isLoading,
    },
    {
      title: t("dashboard.pendingPayments"),
      value: paymentsQ.isLoading ? null : `₹${pendingPayments.toLocaleString()}`,
      subtitle: t("dashboard.awaitingSettlement"),
      icon: CreditCard,
      color: "text-amber-600",
      bg: "bg-amber-50",
      loading: paymentsQ.isLoading,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
      {widgets.map((w) => {
        const Icon = w.icon;
        return (
          <Card key={w.title} className={`border ${w.bg}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">{w.title}</CardTitle>
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 shadow-sm ${w.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {w.loading ? (
                <Skeleton className="h-7 w-24 mb-1" />
              ) : (
                <div className={`text-2xl font-semibold ${w.color}`}>{w.value ?? "—"}</div>
              )}
              <div className="text-xs text-muted-foreground mt-1">{w.subtitle}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
