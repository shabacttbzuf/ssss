import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenant } from "@/hooks/use-active-tenant";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Package, Loader2, Search, Plus, Minus, Trash2, ShoppingCart, ChevronLeft, Banknote, CreditCard, Landmark } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/format";
import { printInvoicePDF, type InvoiceData } from "@/lib/invoice-pdf";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/pos")({
  component: POSPage,
});

type Product = {
  id: string;
  name: string;
  image_url: string | null;
  sale_price: number;
  category_id: string | null;
  is_active: boolean;
};
type Category = { id: string; name: string };
type Branch = { id: string; name: string; tax_number: string | null };
type Session = { id: string; branch_id: string; status: string };

type CartItem = { product_id: string; name: string; unit_price: number; quantity: number };

function POSPage() {
  const { tenantId, tenant, userId, membership, isAdmin } = useActiveTenant();
  const qc = useQueryClient();

  const [branchId, setBranchId] = useState<string | null>(membership?.branch_id ?? null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState("0");
  const [paying, setPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer">("cash");
  const [payOpen, setPayOpen] = useState(false);
  const [openSessionDialog, setOpenSessionDialog] = useState(false);
  const [openingBalance, setOpeningBalance] = useState("0");

  const branches = useQuery({
    queryKey: ["branches-active", tenantId],
    queryFn: async (): Promise<Branch[]> => {
      const { data, error } = await supabase.from("branches").select("id, name, tax_number").eq("tenant_id", tenantId!).eq("is_active", true);
      if (error) throw error;
      return (data ?? []) as Branch[];
    },
    enabled: !!tenantId,
  });

  // If not admin & has assigned branch, lock; otherwise pick first
  useEffect(() => {
    if (branchId) return;
    if (membership?.branch_id) setBranchId(membership.branch_id);
    else if (branches.data && branches.data.length > 0) setBranchId(branches.data[0].id);
  }, [branches.data, membership, branchId]);

  const currentBranch = useMemo(
    () => branches.data?.find((b) => b.id === branchId) ?? null,
    [branches.data, branchId],
  );

  const categories = useQuery({
    queryKey: ["categories-min", tenantId],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase.from("categories").select("id, name").eq("tenant_id", tenantId!).order("sort_order");
      if (error) throw error;
      return (data ?? []) as Category[];
    },
    enabled: !!tenantId,
  });

  const products = useQuery({
    queryKey: ["products-pos", tenantId],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase.from("products").select("id, name, image_url, sale_price, category_id, is_active").eq("tenant_id", tenantId!).eq("is_active", true).order("name");
      if (error) throw error;
      return (data ?? []) as Product[];
    },
    enabled: !!tenantId,
  });

  // Current cashier's open session
  const openSession = useQuery({
    queryKey: ["open-session", userId, branchId],
    queryFn: async (): Promise<Session | null> => {
      if (!userId) return null;
      const { data, error } = await supabase.from("cash_sessions").select("id, branch_id, status").eq("cashier_id", userId).eq("status", "open").maybeSingle();
      if (error) throw error;
      return (data as Session | null) ?? null;
    },
    enabled: !!userId && !!tenantId,
  });

  const filteredProducts = useMemo(() => {
    const list = products.data ?? [];
    const s = search.trim().toLowerCase();
    return list.filter((p) => {
      if (catFilter !== "all" && p.category_id !== catFilter) return false;
      if (!s) return true;
      return p.name.toLowerCase().includes(s);
    });
  }, [products.data, search, catFilter]);

  const addToCart = (p: Product) => {
    setCart((prev) => {
      const found = prev.find((i) => i.product_id === p.id);
      if (found) {
        return prev.map((i) => (i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { product_id: p.id, name: p.name, unit_price: Number(p.sale_price), quantity: 1 }];
    });
  };
  const inc = (id: string) => setCart((p) => p.map((i) => (i.product_id === id ? { ...i, quantity: i.quantity + 1 } : i)));
  const dec = (id: string) => setCart((p) => p.flatMap((i) => (i.product_id === id ? (i.quantity > 1 ? [{ ...i, quantity: i.quantity - 1 }] : []) : [i])));
  const remove = (id: string) => setCart((p) => p.filter((i) => i.product_id !== id));

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.unit_price * i.quantity, 0), [cart]);
  const disc = Math.max(0, Number(discount) || 0);
  const taxable = Math.max(0, subtotal - disc);
  const taxRate = Number(tenant?.tax_rate ?? 0);
  const taxAmount = +(taxable * (taxRate / 100)).toFixed(2);
  const total = +(taxable + taxAmount).toFixed(2);

  const openSess = useMutation({
    mutationFn: async () => {
      if (!tenantId || !branchId || !userId) throw new Error("Missing context");
      const ob = Math.max(0, Number(openingBalance) || 0);
      const { error } = await supabase.from("cash_sessions").insert({
        tenant_id: tenantId,
        branch_id: branchId,
        cashier_id: userId,
        opening_balance: ob,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["open-session"] });
      toast.success("تم فتح الوردية");
      setOpenSessionDialog(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "فشل فتح الوردية"),
  });

  const checkout = useMutation({
    mutationFn: async () => {
      if (!tenantId || !branchId || !userId) throw new Error("سياق ناقص");
      if (cart.length === 0) throw new Error("السلة فارغة");
      if (!openSession.data) throw new Error("يجب فتح وردية أولاً");

      const { data: sale, error: saleErr } = await supabase
        .from("sales")
        .insert({
          tenant_id: tenantId,
          branch_id: branchId,
          cashier_id: userId,
          session_id: openSession.data.id,
          invoice_no: 0,
          subtotal,
          discount: disc,
          tax_amount: taxAmount,
          total,
          payment_method: paymentMethod,
        })
        .select()
        .single();
      if (saleErr) throw saleErr;

      const items = cart.map((c) => ({
        tenant_id: tenantId,
        sale_id: sale.id,
        product_id: c.product_id,
        product_name: c.name,
        quantity: c.quantity,
        unit_price: c.unit_price,
        line_total: +(c.unit_price * c.quantity).toFixed(2),
        tax_rate: taxRate,
      }));
      const { error: itemsErr } = await supabase.from("sale_items").insert(items);
      if (itemsErr) throw itemsErr;

      const { error: payErr } = await supabase.from("payments").insert({
        tenant_id: tenantId,
        sale_id: sale.id,
        method: paymentMethod,
        amount: total,
      });
      if (payErr) throw payErr;

      return { sale, items };
    },
    onSuccess: ({ sale, items }) => {
      toast.success(`تم إصدار فاتورة #${sale.invoice_no}`);
      const invoiceData: InvoiceData = {
        invoice_no: sale.invoice_no,
        created_at: sale.created_at,
        branch_name: currentBranch?.name ?? "",
        cashier_name: "",
        tax_number: currentBranch?.tax_number,
        currency: tenant?.currency ?? "SAR",
        subtotal,
        discount: disc,
        tax_amount: taxAmount,
        total,
        payment_method: paymentMethod,
        items: items.map((i) => ({
          product_name: i.product_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          line_total: i.line_total,
        })),
      };
      try {
        printInvoicePDF(invoiceData);
      } catch (e) {
        console.error(e);
      }
      setCart([]);
      setDiscount("0");
      setPayOpen(false);
      qc.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "فشل إتمام البيع");
      setPaying(false);
    },
  });

  if (branches.isLoading || openSession.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!branches.data || branches.data.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader title="نقطة البيع" />
        <Card><CardContent className="py-10 text-center text-muted-foreground">لا توجد فروع مفعّلة. أنشئ فرعاً أولاً من صفحة الفروع.</CardContent></Card>
      </div>
    );
  }

  // If no open session for this cashier
  if (!openSession.data) {
    return (
      <div className="space-y-4">
        <PageHeader title="نقطة البيع" subtitle="افتح وردية للبدء بالبيع" />
        <Card className="max-w-md">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label>الفرع</Label>
              <Select value={branchId ?? ""} onValueChange={setBranchId} disabled={!isAdmin && !!membership?.branch_id}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {branches.data.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>رصيد بداية الوردية</Label>
              <Input type="number" min="0" step="0.01" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} />
            </div>
            <Button className="w-full" disabled={!branchId || openSess.isPending} onClick={() => openSess.mutate()}>
              {openSess.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              فتح الوردية والبدء بالبيع
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="نقطة البيع"
        subtitle={currentBranch?.name}
        action={<span className="rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">وردية مفتوحة</span>}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Products */}
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث سريع بالاسم..." className="pr-9" autoFocus />
            </div>
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="sm:w-48"><SelectValue placeholder="القسم" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأقسام</SelectItem>
                {(categories.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addToCart(p)}
                className="group overflow-hidden rounded-lg border bg-card text-left transition hover:border-primary hover:shadow-md"
              >
                <div className="aspect-square bg-muted">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center"><Package className="h-10 w-10 text-muted-foreground/40" /></div>
                  )}
                </div>
                <div className="p-2">
                  <div className="line-clamp-1 text-sm font-medium">{p.name}</div>
                  <div className="mt-1 text-sm font-bold text-primary num">
                    {formatMoney(p.sale_price)} <span className="text-[10px] font-normal text-muted-foreground">{tenant?.currency ?? ""}</span>
                  </div>
                </div>
              </button>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">لا توجد منتجات</div>
            )}
          </div>
        </div>

        {/* Cart */}
        <Card className="flex flex-col self-start lg:sticky lg:top-16 lg:h-[calc(100vh-6rem)]">
          <CardContent className="flex h-full flex-col p-4">
            <div className="mb-3 flex items-center gap-2 border-b pb-3">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <span className="font-semibold">السلة ({cart.length})</span>
              {cart.length > 0 && (
                <Button size="sm" variant="ghost" className="mr-auto text-destructive" onClick={() => setCart([])}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
                  <div>
                    <ShoppingCart className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    السلة فارغة
                  </div>
                </div>
              ) : (
                cart.map((i) => (
                  <div key={i.product_id} className="rounded-lg border p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{i.name}</div>
                        <div className="text-xs text-muted-foreground num">{formatMoney(i.unit_price)} × {i.quantity}</div>
                      </div>
                      <div className="text-sm font-bold num">{formatMoney(i.unit_price * i.quantity)}</div>
                    </div>
                    <div className="mt-2 flex items-center gap-1">
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => dec(i.product_id)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="min-w-8 text-center text-sm num">{i.quantity}</span>
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => inc(i.product_id)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="mr-auto h-7 w-7 text-destructive" onClick={() => remove(i.product_id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="mt-3 space-y-2 border-t pt-3">
                <div className="flex items-center gap-2">
                  <Label className="shrink-0 text-xs text-muted-foreground">خصم</Label>
                  <Input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1 rounded-lg bg-muted/50 p-3 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>المجموع الفرعي</span>
                    <span className="num">{formatMoney(subtotal)}</span>
                  </div>
                  {disc > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>الخصم</span>
                      <span className="num">-{formatMoney(disc)}</span>
                    </div>
                  )}
                  {taxRate > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>الضريبة ({taxRate}%)</span>
                      <span className="num">{formatMoney(taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2 text-base font-bold">
                    <span>الإجمالي</span>
                    <span className="num text-primary">{formatMoney(total)} {tenant?.currency}</span>
                  </div>
                </div>
                <Button className="w-full" size="lg" onClick={() => setPayOpen(true)}>
                  الدفع <ChevronLeft className="mr-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>إتمام الدفع</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-primary/5 p-4 text-center">
              <div className="text-xs text-muted-foreground">المبلغ المستحق</div>
              <div className="mt-1 text-3xl font-bold text-primary num">{formatMoney(total)} <span className="text-sm">{tenant?.currency}</span></div>
            </div>
            <div className="space-y-2">
              <Label>طريقة الدفع</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "cash", label: "نقدي", icon: Banknote },
                  { value: "card", label: "بطاقة", icon: CreditCard },
                  { value: "transfer", label: "تحويل", icon: Landmark },
                ] as const).map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPaymentMethod(m.value)}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-3 transition ${
                      paymentMethod === m.value ? "border-primary bg-primary/5" : "hover:bg-muted"
                    }`}
                  >
                    <m.icon className={`h-5 w-5 ${paymentMethod === m.value ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-xs">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>إلغاء</Button>
            <Button
              onClick={() => {
                setPaying(true);
                checkout.mutate();
              }}
              disabled={checkout.isPending}
            >
              {(checkout.isPending || paying) && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              تأكيد الدفع وطباعة الفاتورة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
