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
import { Plus, Edit, Trash2, Tags, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/categories")({
  component: CategoriesPage,
});

type Category = {
  id: string;
  tenant_id: string;
  name: string;
  icon: string | null;
  sort_order: number;
};

const schema = z.object({
  name: z.string().trim().min(2, "الاسم قصير").max(50),
  icon: z.string().trim().max(20).optional().or(z.literal("")),
  sort_order: z.coerce.number().int().min(0).max(999),
});

function CategoriesPage() {
  const { tenantId, isAdmin } = useActiveTenant();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["categories", tenantId],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Category[];
    },
    enabled: !!tenantId,
  });

  const upsert = useMutation({
    mutationFn: async (v: z.infer<typeof schema>) => {
      const payload = { ...v, icon: v.icon || null, tenant_id: tenantId! };
      if (editing) {
        const { error } = await supabase.from("categories").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories", tenantId] });
      toast.success("تم الحفظ");
      setOpen(false); setEditing(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "فشل"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories", tenantId] });
      toast.success("تم الحذف");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "فشل الحذف"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="الأقسام"
        subtitle="نظّم منتجاتك في أقسام (مشروبات، وجبات، حلويات، إضافات)."
        action={
          isAdmin && (
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
              <DialogTrigger asChild>
                <Button><Plus className="ml-2 h-4 w-4" />قسم جديد</Button>
              </DialogTrigger>
              <CategoryDialog initial={editing} onSubmit={(v) => upsert.mutate(v)} pending={upsert.isPending} />
            </Dialog>
          )
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !data || data.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <Tags className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">لا توجد أقسام بعد</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent/20 text-accent-foreground">
                    <Tags className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs text-muted-foreground">ترتيب: {c.sort_order}</div>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => {
                      if (confirm(`حذف "${c.name}"؟`)) del.mutate(c.id);
                    }}>
                      <Trash2 className="h-4 w-4" />
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

function CategoryDialog({
  initial,
  onSubmit,
  pending,
}: {
  initial: Category | null;
  onSubmit: (v: z.infer<typeof schema>) => void;
  pending: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "");
  const [sort, setSort] = useState(String(initial?.sort_order ?? 0));

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{initial ? "تعديل قسم" : "قسم جديد"}</DialogTitle></DialogHeader>
      <form className="space-y-4" onSubmit={(e) => {
        e.preventDefault();
        try {
          onSubmit(schema.parse({ name, icon, sort_order: sort }));
        } catch (err) {
          if (err instanceof z.ZodError) toast.error(err.issues[0].message);
        }
      }}>
        <div className="space-y-2">
          <Label>اسم القسم</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>الأيقونة (اختياري)</Label>
            <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="coffee" dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label>الترتيب</Label>
            <Input type="number" min="0" value={sort} onChange={(e) => setSort(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            حفظ
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
