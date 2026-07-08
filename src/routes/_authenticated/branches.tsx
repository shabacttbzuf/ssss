import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenant } from "@/hooks/use-active-tenant";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/branches")({
  component: BranchesPage,
});

type Branch = {
  id: string;
  tenant_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  tax_number: string | null;
  currency: string;
  logo_url: string | null;
  is_active: boolean;
};

const schema = z.object({
  name: z.string().trim().min(2, "الاسم قصير").max(100),
  address: z.string().trim().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  tax_number: z.string().trim().max(50).optional().or(z.literal("")),
  currency: z.string().trim().min(1).max(5),
  is_active: z.boolean(),
});

function BranchesPage() {
  const { tenantId, isAdmin } = useActiveTenant();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);

  const { data: branches, isLoading } = useQuery({
    queryKey: ["branches", tenantId],
    queryFn: async (): Promise<Branch[]> => {
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Branch[];
    },
    enabled: !!tenantId,
  });

  const upsert = useMutation({
    mutationFn: async (input: z.infer<typeof schema>) => {
      const payload = {
        ...input,
        address: input.address || null,
        phone: input.phone || null,
        tax_number: input.tax_number || null,
        tenant_id: tenantId!,
      };
      if (editing) {
        const { error } = await supabase.from("branches").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("branches").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches", tenantId] });
      toast.success(editing ? "تم التعديل" : "تم إنشاء الفرع");
      setOpen(false);
      setEditing(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "فشلت العملية"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("branches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches", tenantId] });
      toast.success("تم الحذف");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "فشل الحذف"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="الفروع"
        subtitle="أدر فروع مطعمك — كل فرع لديه إعدادات وعملة ورقم ضريبي مستقلين."
        action={
          isAdmin && (
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
              <DialogTrigger asChild>
                <Button><Plus className="ml-2 h-4 w-4" />إضافة فرع</Button>
              </DialogTrigger>
              <BranchDialog
                initial={editing}
                onSubmit={(v) => upsert.mutate(v)}
                pending={upsert.isPending}
              />
            </Dialog>
          )
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !branches || branches.length === 0 ? (
        <EmptyState onAdd={isAdmin ? () => setOpen(true) : undefined} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {branches.map((b) => (
            <Card key={b.id} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold">{b.name}</div>
                      <div className="text-xs text-muted-foreground">{b.currency}</div>
                    </div>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      b.is_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {b.is_active ? "نشط" : "متوقف"}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {b.address && <div>📍 {b.address}</div>}
                  {b.phone && <div dir="ltr">📞 {b.phone}</div>}
                  {b.tax_number && <div>الرقم الضريبي: <span dir="ltr">{b.tax_number}</span></div>}
                </div>
                {isAdmin && (
                  <div className="mt-4 flex gap-2 border-t pt-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1"
                      onClick={() => { setEditing(b); setOpen(true); }}
                    >
                      <Edit className="ml-2 h-3 w-3" />تعديل
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`حذف الفرع "${b.name}"؟`)) del.mutate(b.id);
                      }}
                    >
                      <Trash2 className="ml-2 h-3 w-3" />حذف
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd?: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <Building2 className="h-10 w-10 text-muted-foreground/50" />
        <p className="text-muted-foreground">لا توجد فروع بعد</p>
        {onAdd && <Button onClick={onAdd}><Plus className="ml-2 h-4 w-4" />أنشئ الفرع الأول</Button>}
      </CardContent>
    </Card>
  );
}

function BranchDialog({
  initial,
  onSubmit,
  pending,
}: {
  initial: Branch | null;
  onSubmit: (v: z.infer<typeof schema>) => void;
  pending: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [tax, setTax] = useState(initial?.tax_number ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? "SAR");
  const [active, setActive] = useState(initial?.is_active ?? true);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{initial ? "تعديل فرع" : "إضافة فرع جديد"}</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            const parsed = schema.parse({
              name,
              address,
              phone,
              tax_number: tax,
              currency,
              is_active: active,
            });
            onSubmit(parsed);
          } catch (err) {
            if (err instanceof z.ZodError) toast.error(err.issues[0].message);
          }
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="b-name">اسم الفرع</Label>
          <Input id="b-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="b-address">العنوان</Label>
          <Input id="b-address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="b-phone">الهاتف</Label>
            <Input id="b-phone" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-currency">العملة</Label>
            <Input id="b-currency" dir="ltr" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={5} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="b-tax">الرقم الضريبي</Label>
          <Input id="b-tax" dir="ltr" value={tax} onChange={(e) => setTax(e.target.value)} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label htmlFor="b-active">الفرع نشط</Label>
          <Switch id="b-active" checked={active} onCheckedChange={setActive} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            {initial ? "حفظ التعديلات" : "إضافة"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
