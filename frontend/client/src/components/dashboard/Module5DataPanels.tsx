import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { normalizeListResponse, sortRows, exportRowsToCsv } from "@/lib/module5";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Download, ArrowUpDown, RefreshCw, Plus, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 8;

type SectionKey = "payments" | "vehicles" | "ledger" | "audits";

type PaymentRow = {
  id: string;
  guestId?: string | null;
  reservationId?: string | null;
  amount: number;
  finalAmount?: number | null;
  method?: string | null;
  paymentStatus?: string | null;
  transactionId?: string | null;
  createdAt?: string | null;
};

type VehicleRow = {
  id: string;
  guestId?: string | null;
  reservationId?: string | null;
  make: string;
  model: string;
  licensePlate: string;
  state?: string | null;
  vehicleType?: string | null;
  parkingSlot?: string | null;
  parkingStatus?: string | null;
  createdAt?: string | null;
};

type LedgerRow = {
  id: string;
  employeeName: string;
  openingCash?: number | null;
  closingCash?: number | null;
  expectedCash?: number | null;
  actualCash?: number | null;
  difference?: number | null;
  variance?: number | null;
  status?: string | null;
  createdAt?: string | null;
};

type AuditRow = {
  id: string;
  employeeName: string;
  openingCash?: number | null;
  closingCash?: number | null;
  expectedCash?: number | null;
  actualCash?: number | null;
  difference?: number | null;
  variance?: number | null;
  status?: string | null;
  notes?: string | null;
  createdAt?: string | null;
};

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value ?? 0);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SectionShell({ title, subtitle, badge, children }: { title: string; subtitle: string; badge: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden border-slate-200/80 bg-white/80 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <CardHeader className="border-b border-slate-100/80 bg-linear-to-r from-slate-50 to-[#F3EDE4]/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900">{title}</CardTitle>
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          </div>
          <Badge variant="secondary" className="rounded-full border border-[#C4A882] bg-[#F3EDE4] text-[#8B6748] font-semibold">{badge}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

export default function Module5DataPanels() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const paymentsQuery = useQuery({
    queryKey: ["module5", "payments", { page, search, sortBy, sortOrder, filter }],
    queryFn: async () => {
      const { data } = await apiClient.payments.list({ page, limit: PAGE_SIZE, q: search, sortBy, sortOrder });
      return normalizeListResponse<PaymentRow>(data);
    },
  });

  const vehiclesQuery = useQuery({
    queryKey: ["module5", "vehicles", { page, search, sortBy, sortOrder, filter }],
    queryFn: async () => {
      const { data } = await apiClient.vehicles.list({ page, limit: PAGE_SIZE, q: search, sortBy, sortOrder });
      return normalizeListResponse<VehicleRow>(data);
    },
  });

  const ledgerQuery = useQuery({
    queryKey: ["module5", "ledger", { page, search, sortBy, sortOrder, filter }],
    queryFn: async () => {
      const { data } = await apiClient.cashLedger.list({ page, limit: PAGE_SIZE, q: search, sortBy, sortOrder });
      return normalizeListResponse<LedgerRow>(data);
    },
  });

  const auditsQuery = useQuery({
    queryKey: ["module5", "audits", { page, search, sortBy, sortOrder, filter }],
    queryFn: async () => {
      const { data } = await apiClient.shiftAudits.list({ page, limit: PAGE_SIZE, q: search, sortBy, sortOrder });
      return normalizeListResponse<AuditRow>(data);
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: (payload: Partial<PaymentRow>) => apiClient.payments.create(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ["module5", "payments"] });
      const previous = queryClient.getQueryData(["module5", "payments"]);
      queryClient.setQueryData(["module5", "payments"], (current: any) => ({
        ...current,
        items: [{ id: `temp-${Date.now()}`, ...payload, createdAt: new Date().toISOString() }, ...(current?.items ?? [])],
      }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["module5", "payments"], context?.previous);
      toast.error("Payment update failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["module5", "payments"] });
      toast.success("Payment synced to PostgreSQL");
    },
  });

  const createVehicleMutation = useMutation({
    mutationFn: (payload: Partial<VehicleRow>) => apiClient.vehicles.create(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ["module5", "vehicles"] });
      const previous = queryClient.getQueryData(["module5", "vehicles"]);
      queryClient.setQueryData(["module5", "vehicles"], (current: any) => ({
        ...current,
        items: [{ id: `temp-${Date.now()}`, ...payload, createdAt: new Date().toISOString() }, ...(current?.items ?? [])],
      }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["module5", "vehicles"], context?.previous);
      toast.error("Vehicle update failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["module5", "vehicles"] });
      toast.success("Vehicle synced to PostgreSQL");
    },
  });

  const createLedgerMutation = useMutation({
    mutationFn: (payload: Partial<LedgerRow>) => apiClient.cashLedger.create(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ["module5", "ledger"] });
      const previous = queryClient.getQueryData(["module5", "ledger"]);
      queryClient.setQueryData(["module5", "ledger"], (current: any) => ({
        ...current,
        items: [{ id: `temp-${Date.now()}`, ...payload, createdAt: new Date().toISOString() }, ...(current?.items ?? [])],
      }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["module5", "ledger"], context?.previous);
      toast.error("Ledger update failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["module5", "ledger"] });
      toast.success("Ledger synced to PostgreSQL");
    },
  });

  const createAuditMutation = useMutation({
    mutationFn: (payload: Partial<AuditRow>) => apiClient.shiftAudits.create(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ["module5", "audits"] });
      const previous = queryClient.getQueryData(["module5", "audits"]);
      queryClient.setQueryData(["module5", "audits"], (current: any) => ({
        ...current,
        items: [{ id: `temp-${Date.now()}`, ...payload, createdAt: new Date().toISOString() }, ...(current?.items ?? [])],
      }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["module5", "audits"], context?.previous);
      toast.error("Audit update failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["module5", "audits"] });
      toast.success("Audit synced to PostgreSQL");
    },
  });

  const sections: Array<{ key: SectionKey; title: string; subtitle: string; badge: string; query: any; rows: any[]; columns: any[]; onAdd: () => void }> = [
    {
      key: "payments",
      title: "Payments",
      subtitle: "Live payment activity from PostgreSQL",
      badge: "Live",
      query: paymentsQuery,
      rows: paymentsQuery.data?.items ?? [],
      columns: [
        { key: "transactionId", label: "Reference", render: (row: PaymentRow) => row.transactionId ?? "—" },
        { key: "method", label: "Method", render: (row: PaymentRow) => row.method ?? "—" },
        { key: "amount", label: "Amount", render: (row: PaymentRow) => formatCurrency(row.amount) },
        { key: "paymentStatus", label: "Status", render: (row: PaymentRow) => row.paymentStatus ?? "—" },
        { key: "createdAt", label: "Recorded", render: (row: PaymentRow) => formatDate(row.createdAt) },
      ],
      onAdd: () => createPaymentMutation.mutate({ amount: 1000, method: "card", paymentStatus: "paid", transactionId: `TX-${Date.now()}` }),
    },
    {
      key: "vehicles",
      title: "Vehicles",
      subtitle: "Live parking and vehicle records from PostgreSQL",
      badge: "Live",
      query: vehiclesQuery,
      rows: vehiclesQuery.data?.items ?? [],
      columns: [
        { key: "licensePlate", label: "Plate", render: (row: VehicleRow) => row.licensePlate },
        { key: "make", label: "Make", render: (row: VehicleRow) => `${row.make} ${row.model}` },
        { key: "parkingSlot", label: "Slot", render: (row: VehicleRow) => row.parkingSlot ?? "—" },
        { key: "parkingStatus", label: "Status", render: (row: VehicleRow) => row.parkingStatus ?? "—" },
        { key: "createdAt", label: "Created", render: (row: VehicleRow) => formatDate(row.createdAt) },
      ],
      onAdd: () => createVehicleMutation.mutate({ make: "Honda", model: "City", licensePlate: `KA${Date.now().toString().slice(-5)}`, state: "KA", parkingStatus: "parked" }),
    },
    {
      key: "ledger",
      title: "Cash Ledger",
      subtitle: "Live cash reconciliation from PostgreSQL",
      badge: "Live",
      query: ledgerQuery,
      rows: ledgerQuery.data?.items ?? [],
      columns: [
        { key: "employeeName", label: "Employee", render: (row: LedgerRow) => row.employeeName },
        { key: "openingCash", label: "Opening", render: (row: LedgerRow) => formatCurrency(row.openingCash) },
        { key: "closingCash", label: "Closing", render: (row: LedgerRow) => formatCurrency(row.closingCash) },
        { key: "difference", label: "Difference", render: (row: LedgerRow) => formatCurrency(row.difference) },
        { key: "status", label: "Status", render: (row: LedgerRow) => row.status ?? "—" },
      ],
      onAdd: () => createLedgerMutation.mutate({ employeeName: "New Shift", openingCash: 1000, closingCash: 1050, expectedCash: 1050, actualCash: 1050, difference: 50, variance: 50, status: "open" }),
    },
    {
      key: "audits",
      title: "Shift Audit",
      subtitle: "Live shift audit findings from PostgreSQL",
      badge: "Live",
      query: auditsQuery,
      rows: auditsQuery.data?.items ?? [],
      columns: [
        { key: "employeeName", label: "Employee", render: (row: AuditRow) => row.employeeName },
        { key: "expectedCash", label: "Expected", render: (row: AuditRow) => formatCurrency(row.expectedCash) },
        { key: "actualCash", label: "Actual", render: (row: AuditRow) => formatCurrency(row.actualCash) },
        { key: "variance", label: "Variance", render: (row: AuditRow) => formatCurrency(row.variance) },
        { key: "status", label: "Status", render: (row: AuditRow) => row.status ?? "—" },
      ],
      onAdd: () => createAuditMutation.mutate({ employeeName: "New Audit", expectedCash: 5000, actualCash: 4900, variance: 100, status: "open", notes: "Created from dashboard" }),
    },
  ];

  const handleExport = (section: typeof sections[number]) => {
    const csv = exportRowsToCsv(section.rows, section.columns);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${section.title.toLowerCase().replace(/\s+/g, "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${section.title} exported`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-4xl border border-slate-200/80 bg-white/75 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div>
          <p className="text-sm font-semibold text-[#8B6748]">Module 5 operations</p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Payments, vehicles, cash ledger and shift audits</h2>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <RefreshCw className="h-4 w-4" />
          Synced to PostgreSQL REST APIs
        </div>
      </div>

      <div className="rounded-4xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search across module 5 records" className="pl-10" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-35">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="parked">Parked</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Created</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="employeeName">Employee</SelectItem>
                <SelectItem value="licensePlate">Plate</SelectItem>
                <SelectItem value="variance">Variance</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
              <ArrowUpDown className="mr-2 h-4 w-4" />
              {sortOrder === "asc" ? "Asc" : "Desc"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {sections.map((section) => {
          const isLoading = section.query.isLoading;
          const isError = section.query.isError;
          const rows = section.rows ?? [];
          const displayedRows = useMemo(() => sortRows([...rows], sortBy, sortOrder).filter((row: any) => {
            const haystack = `${row?.transactionId ?? ""} ${row?.licensePlate ?? ""} ${row?.employeeName ?? ""} ${row?.make ?? ""} ${row?.model ?? ""}`.toLowerCase();
            const matchesSearch = !search || haystack.includes(search.toLowerCase());
            const matchesFilter = filter === "all" || (row?.paymentStatus ?? row?.parkingStatus ?? row?.status ?? "").toLowerCase() === filter.toLowerCase();
            return matchesSearch && matchesFilter;
          }).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [rows, search, filter, sortBy, sortOrder, page]);
          const totalPages = Math.max(1, section.query.data?.pages ?? 1);

          return (
            <SectionShell key={section.key} title={section.title} subtitle={section.subtitle} badge={section.badge}>
              <div className="flex items-center justify-between border-b border-slate-100/80 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Badge variant="secondary">{displayedRows.length} shown</Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => section.onAdd()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExport(section)}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </div>
              {isLoading ? (
                <div className="space-y-3 p-4">
                  {[1, 2, 3].map((index) => <Skeleton key={index} className="h-10 rounded-xl" />)}
                </div>
              ) : isError ? (
                <div className="p-6 text-sm text-red-600">Unable to load live records from the PostgreSQL API right now.</div>
              ) : rows.length === 0 ? (
                <div className="p-6 text-sm text-slate-600">No live records found for this module.</div>
              ) : (
                <div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {section.columns.map((column) => (
                            <TableHead key={column.key}>{column.label}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayedRows.map((row: any) => (
                          <TableRow key={row.id}>
                            {section.columns.map((column) => (
                              <TableCell key={`${row.id}-${column.key}`}>
                                {column.render ? column.render(row) : row[column.key] ?? "—"}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100/80 px-4 py-3 text-sm text-slate-600">
                      <Button variant="outline" size="sm" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1}>
                        <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                      </Button>
                      <span>Page {page} of {totalPages}</span>
                      <Button variant="outline" size="sm" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages}>
                        Next <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </SectionShell>
          );
        })}
      </div>
    </div>
  );
}
