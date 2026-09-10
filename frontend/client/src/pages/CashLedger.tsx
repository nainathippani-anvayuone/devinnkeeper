import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { normalizeListResponse, exportRowsToCsv } from "@/lib/module5";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ledgerFormSchema, LedgerForm } from "@/lib/module5Schemas";
import { useTranslation } from "react-i18next";
import { DataTablePagination } from "@/components/ui/DataTablePagination";

export default function CashLedgerPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const qc = useQueryClient();

  const q = useQuery({ queryKey:["cash-ledger",search, page], queryFn: async ()=>{ const { data } = await apiClient.cashLedger.list({ limit: 50, q: search }); return normalizeListResponse<any>(data); } });
  const items = q.data?.items ?? [];
  const totalPages = Math.ceil(items.length / itemsPerPage) || 1;

  const openShift = useMutation({ mutationFn: (payload:any)=>apiClient.cashLedger.create(payload), onSuccess: ()=>{qc.invalidateQueries({ queryKey: ["cash-ledger"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); toast.success("Shift opened");}, onError: (err:any)=>{ const msg = err?.response?.data?.error ?? err?.message ?? "Failed"; toast.error(String(msg)); } });

  const updateShift = useMutation({ mutationFn: ({ id, data }:any) => apiClient.cashLedger.update(id, data), onSuccess: ()=>{qc.invalidateQueries({ queryKey: ["cash-ledger"] }); toast.success("Shift updated");}, onError: (err:any)=>{ const msg = err?.response?.data?.error ?? err?.message ?? "Failed"; toast.error(String(msg)); } });

  const deleteShift = useMutation({ mutationFn: (id:string)=>apiClient.cashLedger.remove(id), onSuccess: ()=>{qc.invalidateQueries({ queryKey: ["cash-ledger"] }); toast.success("Shift removed");}, onError: (err:any)=>{ const msg = err?.response?.data?.error ?? err?.message ?? "Failed"; toast.error(String(msg)); } });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const form = useForm<LedgerForm>({ resolver: zodResolver(ledgerFormSchema) as any, defaultValues: { employeeName: "", openingCash: 0, closingCash: 0, status: "open", notes: "" } });

  useEffect(()=>{ if(!dialogOpen){ form.reset(); setEditing(null); } }, [dialogOpen]);

  const handleOpen = ()=>{ setEditing(null); form.reset(); setDialogOpen(true); };

  const handleExport = ()=>{
    const csv = exportRowsToCsv(q.data?.items ?? [], [
      { key: "id", label: "ID" },
      { key: "employeeName", label: "Employee" },
      { key: "openingCash", label: "Opening" },
      { key: "closingCash", label: "Closing" },
    ]);
    const blob = new Blob([csv], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "cash-ledger.csv"; a.click();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-lg sm:text-xl font-bold">{t("cashLedger.title")}</CardTitle>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Input placeholder={t("cashLedger.searchPlaceholder")} value={search} onChange={(e:any)=>setSearch(e.target.value)} className="w-full sm:w-64" />
            <div className="flex items-center gap-2">
              <Button onClick={handleOpen} className="cursor-pointer flex-1 sm:flex-none">{t("cashLedger.openShift")}</Button>
              <Button variant="outline" onClick={handleExport} className="cursor-pointer flex-1 sm:flex-none">Export CSV</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("cashLedger.employee")}</TableHead>
                  <TableHead>{t("cashLedger.opening")}</TableHead>
                  <TableHead>{t("cashLedger.closing")}</TableHead>
                  <TableHead>{t("cashLedger.expected")}</TableHead>
                  <TableHead>{t("cashLedger.actual")}</TableHead>
                  <TableHead>{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(itemsPerPage === 0 ? items : items.slice((page - 1) * itemsPerPage, page * itemsPerPage)).map((r:any)=> (
                  <TableRow key={r.id}>
                    <TableCell className="font-semibold">{r.employeeName}</TableCell>
                    <TableCell>₹{r.openingCash}</TableCell>
                    <TableCell>₹{r.closingCash}</TableCell>
                    <TableCell>₹{r.expectedCash}</TableCell>
                    <TableCell>₹{r.actualCash}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button size="sm" className="cursor-pointer" onClick={()=>{ setEditing(r); form.reset({ employeeName: r.employeeName, openingCash: r.openingCash ?? 0, closingCash: r.closingCash ?? 0, status: r.status ?? "open", notes: r.notes ?? "" }); setDialogOpen(true); }}>{t("common.edit")}</Button>
                      <Button size="sm" variant="destructive" className="cursor-pointer" onClick={()=>{ if(!window.confirm("Delete ledger entry?")) return; deleteShift.mutate(r.id); }}>{t("common.delete")}</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <DataTablePagination
            currentPage={page}
            totalPages={itemsPerPage === 0 ? 1 : Math.ceil(items.length / itemsPerPage) || 1}
            totalItems={items.length}
            pageSize={itemsPerPage}
            onPageChange={setPage}
            onPageSizeChange={setItemsPerPage}
            pageSizeOptions={[10, 20, 50, 0]}
            itemName="shift entries"
          />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-900">{editing ? t("cashLedger.editShift") : t("cashLedger.openShift")}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((values)=>{
              if (!values.employeeName || !values.employeeName.trim()) {
                toast.error("Employee Name is required");
                return;
              }
              if (editing) {
                updateShift.mutate({ id: editing.id, data: values });
              } else {
                openShift.mutate(values);
              }
              setDialogOpen(false);
            })} className="space-y-4 pt-2">
              <FormItem>
                <FormLabel className="font-semibold text-slate-800">{t("cashLedger.employeeName")}</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. John Doe" required {...form.register("employeeName", { required: true })} />
                </FormControl>
              </FormItem>
              <FormItem>
                <FormLabel className="font-semibold text-slate-800">{t("cashLedger.openingCash")}</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0.00" required {...form.register("openingCash", { valueAsNumber: true })} />
                </FormControl>
              </FormItem>
              <FormItem>
                <FormLabel className="font-semibold text-slate-800">{t("cashLedger.notes")}</FormLabel>
                <FormControl>
                  <Input placeholder="Shift notes..." {...form.register("notes")} />
                </FormControl>
              </FormItem>
              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" variant="outline" className="h-11 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium px-6 shadow-2xs cursor-pointer" onClick={()=>setDialogOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" className="h-11 rounded-2xl bg-[#8B6748] hover:bg-[#7A5A3C] text-white font-semibold px-6 shadow-md shadow-[#8B6748]/20" disabled={openShift.isPending || updateShift.isPending}>
                  {openShift.isPending || updateShift.isPending ? t("common.saving") : t("cashLedger.saveShift")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

