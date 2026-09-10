import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { toast } from "sonner";
import { normalizeListResponse, exportRowsToCsv } from "@/lib/module5";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { paymentFormSchema, PaymentForm } from "@/lib/module5Schemas";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTablePagination } from "@/components/ui/DataTablePagination";

import { useTranslation } from "react-i18next";

export default function PaymentsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const qc = useQueryClient();

  const paymentsQ = useQuery({
    queryKey: ["payments", page, pageSize, search],
    queryFn: async () => {
      const { data } = await apiClient.payments.list({ page, limit: pageSize === 0 ? 1000 : pageSize, q: search });
      return normalizeListResponse<any>(data);
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => apiClient.payments.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Payment saved to PostgreSQL");
    },
    onError: () => toast.error("Failed to create payment"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiClient.payments.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Payment updated");
    },
    onError: (err:any) => {
      const msg = err?.response?.data?.error ?? err?.message ?? "Failed to update payment";
      toast.error(String(msg));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.payments.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payments"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); toast.success("Payment deleted"); },
    onError: () => toast.error("Failed to delete payment"),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const form = useForm<PaymentForm>({ resolver: zodResolver(paymentFormSchema) as any, defaultValues: { reservationId: "", amount: 0, method: "Credit Card", paymentStatus: "Pending", notes: "" } });

  useEffect(()=>{ if (!dialogOpen) { form.reset(); setEditing(null); } }, [dialogOpen]);

  const handleCreate = ()=>{ setEditing(null); form.reset(); setDialogOpen(true); };

  const handleExport = () => {
    const csv = exportRowsToCsv(paymentsQ.data?.items ?? [], [
      { key: "id", label: "Payment ID" },
      { key: "reservationId", label: "Reservation" },
      { key: "guest", label: "Guest" },
      { key: "roomId", label: "Room ID" },
      { key: "amount", label: "Amount" },
      { key: "method", label: "Payment Method" },
      { key: "status", label: "Status" },
      { key: "createdAt", label: "Recorded Date" },
    ]);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "payments.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-lg sm:text-xl font-bold">{t("payments.title")}</CardTitle>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Input placeholder={t("payments.searchPlaceholder")} value={search} onChange={(e:any)=>setSearch(e.target.value)} className="w-full sm:w-64" />
            <Button variant="outline" onClick={handleExport} className="cursor-pointer shrink-0">Export CSV</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("payments.paymentId")}</TableHead>
                  <TableHead>{t("payments.reservationId")}</TableHead>
                  <TableHead>{t("payments.guest")}</TableHead>
                  <TableHead>{t("reservations.roomNumber")}</TableHead>
                  <TableHead>{t("payments.amount")}</TableHead>
                  <TableHead>{t("payments.method")}</TableHead>
                  <TableHead>{t("payments.status")}</TableHead>
                  <TableHead>{t("payments.date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(paymentsQ.data?.items ?? []).map((p: any, idx: number) => {
                  const rawGuest = p.reservation?.guest ? `${p.reservation.guest.firstName} ${p.reservation.guest.lastName}`.trim() : (typeof p.guest === "string" && p.guest !== "Unknown Guest" && p.guest !== "—" ? p.guest : null);
                  const statusStr = (p.status ?? p.paymentStatus ?? "").toString().toLowerCase();
                  const isCompletedOrPaid = statusStr === "completed" || statusStr === "paid";
                  const displayGuest = isCompletedOrPaid && rawGuest ? rawGuest : "—";
                  const displayStatus = isCompletedOrPaid 
                    ? t("payments.paid", "Paid") 
                    : statusStr === "pending"
                      ? t("payments.pending", "Pending")
                      : statusStr === "refunded"
                        ? t("payments.refunded", "Refunded")
                        : statusStr === "failed"
                          ? t("payments.failed", "Failed")
                          : (p.status ?? p.paymentStatus ?? "—");

                  const totalItems = paymentsQ.data?.items?.length || 1;
                  const displayPayId = `PAY-${String(totalItems - idx).padStart(4, '0')}`;
                  const displayResId = p.reservationId ? `RES-${String(p.reservationId).padStart(4, '0')}` : "—";

                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs font-bold text-foreground">{displayPayId}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{displayResId}</TableCell>
                      <TableCell className="font-medium">{displayGuest}</TableCell>
                      <TableCell className="font-semibold">{p.roomId || p.reservation?.roomId || "—"}</TableCell>
                      <TableCell className="font-semibold text-foreground">₹{(p.amount ?? 0).toLocaleString()}</TableCell>
                      <TableCell>{p.method ?? "—"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                          isCompletedOrPaid 
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                            : statusStr === "pending"
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              : "bg-slate-500/10 text-slate-600 border-slate-500/20"
                        }`}>
                          {displayStatus}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.createdAt ? new Date(p.createdAt).toLocaleString() : "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <DataTablePagination
            currentPage={page}
            totalPages={paymentsQ.data?.pages || Math.ceil((paymentsQ.data?.total ?? 0) / (pageSize || 20)) || 1}
            totalItems={paymentsQ.data?.total ?? paymentsQ.data?.items?.length ?? 0}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 20, 50, 0]}
            itemName="payments"
          />
        </CardContent>
      </Card>
    </div>
  );
}
