import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bed, IndianRupee, TrendingUp, BarChart3, Sparkles, ArrowUpRight } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { useTranslation } from "react-i18next";

interface Room {
  id: number;
  number: string;
  name: string;
  type: string;
  floor: number;
  status: string;
  rate: number;
  capacity: number;
  isAvailable: number;
}

interface Reservation {
  id: number;
  roomId: number | null;
  checkIn: Date;
  checkOut: Date;
  status: string;
  totalCharges: number | null;
}

interface MetricsDashboardProps {
  rooms: Room[];
  reservations: Reservation[];
}

export default function MetricsDashboard({ rooms, reservations }: MetricsDashboardProps) {
  const { t } = useTranslation();
  const metrics = useMemo(() => {
    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter((r) => r.status === "occupied").length;
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    const activeReservations = reservations.filter(
      (r) => r.status === "checked_in" || r.status === "confirmed"
    );
    const totalRevenue = activeReservations.reduce(
      (sum, r) => sum + (r.totalCharges || 0),
      0
    );
    const adr = activeReservations.length > 0 ? totalRevenue / activeReservations.length : 0;
    const revpar = adr * (occupancyRate / 100);

    return { occupancyRate, adr, revpar, totalRooms, occupiedRooms };
  }, [rooms, reservations]);

  const weeklyData = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const today = new Date();
    const totalRooms = rooms.length;

    return days.map((day, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - i));
      const dayReservations = reservations.filter((r) => {
        const ci = new Date(r.checkIn);
        const co = new Date(r.checkOut);
        return ci <= date && co > date && (r.status === "checked_in" || r.status === "confirmed");
      });
      const dayOccupied = dayReservations.length;
      const dayOccupancy = totalRooms > 0 ? Math.round((dayOccupied / totalRooms) * 100) : 0;
      const dayRevenue = dayReservations.reduce((sum, r) => sum + (r.totalCharges || 0), 0);
      const dayAdr = dayReservations.length > 0
        ? Math.round(dayRevenue / dayReservations.length)
        : 0;

      return {
        day,
        occupancy: dayOccupancy,
        adr: dayAdr,
        revpar: Math.round((dayAdr * dayOccupancy) / 100),
      };
    });
  }, [rooms, reservations]);

  const adrTrend = useMemo(() => {
    const withData = weeklyData.filter((d) => d.adr > 0);
    if (withData.length < 2) return null;
    const first = withData[0].adr;
    const last = withData[withData.length - 1].adr;
    if (first === 0) return null;
    return Math.round(((last - first) / first) * 1000) / 10;
  }, [weeklyData]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
    >
      {[
        {
          title: "Occupancy",
          value: `${metrics.occupancyRate}%`,
          detail: `${metrics.occupiedRooms} of ${metrics.totalRooms} rooms occupied`,
          icon: Bed,
          accent: "from-[#8B6748]/10 to-[#B89572]/5",
          tint: "text-[#8B6748]",
          progress: metrics.occupancyRate,
        },
        {
          title: "Today's Revenue",
          value: `₹${metrics.adr.toLocaleString()}`,
          detail: "Payments collected today",
          icon: IndianRupee,
          accent: "from-emerald-500/10 to-teal-500/5",
          tint: "text-emerald-600 dark:text-emerald-400",
          progress: Math.min(metrics.adr / 200, 100),
        },
        {
          title: "Parking Occupancy",
          value: "14",
          detail: "Vehicles currently registered",
          icon: TrendingUp,
          accent: "from-purple-500/10 to-indigo-500/5",
          tint: "text-purple-600 dark:text-purple-400",
          progress: 45,
        },
        {
          title: "Pending Payments",
          value: "₹0",
          detail: "Awaiting settlement",
          icon: BarChart3,
          accent: "from-amber-500/10 to-yellow-500/5",
          tint: "text-amber-600 dark:text-amber-400",
          progress: 0,
        },
      ].map((metric, index) => {
        const Icon = metric.icon;
        return (
          <motion.div variants={item} key={metric.title}>
            <Card className={`overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br ${metric.accent} shadow-2xs`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{metric.title}</CardTitle>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-xl bg-white/90 dark:bg-slate-800 shadow-2xs ${metric.tint}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{metric.value}</div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-800">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${metric.progress}%` }}
                    transition={{ duration: 0.7, delay: index * 0.05, ease: [0.23, 1, 0.32, 1] }}
                    className={`h-full rounded-full bg-gradient-to-r ${
                      index === 0 ? "from-[#8B6748] to-[#B89572]" :
                      index === 1 ? "from-emerald-500 to-teal-500" :
                      index === 2 ? "from-purple-500 to-indigo-500" :
                      "from-amber-500 to-yellow-500"
                    }`}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">{metric.detail}</p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}

      <motion.div variants={item} className="md:col-span-2">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">{t("dashboard.weeklyOccupancyTrend")}</CardTitle>
              <div className="flex items-center gap-2 rounded-full bg-[#F3EDE4] px-2.5 py-1 text-xs font-semibold text-[#8B6748] border border-[#C4A882]">
                <Sparkles className="h-3.5 w-3.5" />
                {t("dashboard.liveOutlook")}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: 180, minHeight: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="occupancyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.62 0.18 245)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.62 0.18 245)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="occupancy"
                    stroke="oklch(0.62 0.18 245)"
                    fill="url(#occupancyGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item} className="md:col-span-2">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">{t("dashboard.adrPerformance")}</CardTitle>
              {adrTrend !== null && (
                <div
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                    adrTrend >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                  }`}
                >
                  <ArrowUpRight className={`h-3.5 w-3.5 ${adrTrend < 0 ? "rotate-180" : ""}`} />
                  {adrTrend >= 0 ? "Up" : "Down"} {Math.abs(adrTrend)}%
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: 180, minHeight: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={[0, 'auto']} tickFormatter={(value) => `₹${value}`} />
                  <Tooltip
                    formatter={(value: any) => [`₹${value}`, 'ADR']}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="adr" fill="oklch(0.58 0.15 150)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
