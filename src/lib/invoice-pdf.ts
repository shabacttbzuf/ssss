import { jsPDF } from "jspdf";
import { formatMoney, formatDateTime } from "./format";

export type InvoiceData = {
  invoice_no: number;
  created_at: string;
  branch_name: string;
  cashier_name: string;
  tax_number?: string | null;
  currency: string;
  subtotal: number;
  discount: number;
  tax_amount: number;
  total: number;
  payment_method: string;
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
};

const paymentLabels: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  transfer: "Transfer",
  mixed: "Mixed",
};

/**
 * Generate a printable invoice PDF.
 * NOTE: jsPDF has no bundled Arabic font. To keep this shippable without
 * a 500KB TTF, we render the invoice in English with numeric values. The
 * on-screen invoice view is fully Arabic; PDF is a receipt-style summary.
 */
export function generateInvoicePDF(data: InvoiceData): Blob {
  const doc = new jsPDF({ unit: "mm", format: [80, 200] });

  const pageWidth = 80;
  let y = 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(data.branch_name, pageWidth / 2, y, { align: "center" });
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  if (data.tax_number) {
    doc.text(`Tax No: ${data.tax_number}`, pageWidth / 2, y, { align: "center" });
    y += 4;
  }

  doc.setLineDashPattern([1, 1], 0);
  doc.line(4, y, pageWidth - 4, y);
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`Invoice #${data.invoice_no}`, 4, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(formatDateTime(data.created_at), 4, y);
  y += 4;
  doc.text(`Cashier: ${data.cashier_name}`, 4, y);
  y += 4;

  doc.line(4, y, pageWidth - 4, y);
  y += 4;

  // Items
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Item", 4, y);
  doc.text("Qty", 44, y, { align: "right" });
  doc.text("Price", 58, y, { align: "right" });
  doc.text("Total", 76, y, { align: "right" });
  y += 3;
  doc.line(4, y, pageWidth - 4, y);
  y += 3;

  doc.setFont("helvetica", "normal");
  for (const item of data.items) {
    const name = item.product_name.length > 22 ? item.product_name.slice(0, 22) + "…" : item.product_name;
    doc.text(name, 4, y);
    doc.text(String(item.quantity), 44, y, { align: "right" });
    doc.text(formatMoney(item.unit_price), 58, y, { align: "right" });
    doc.text(formatMoney(item.line_total), 76, y, { align: "right" });
    y += 4;
  }

  doc.line(4, y, pageWidth - 4, y);
  y += 4;

  const putRow = (label: string, value: string, bold = false) => {
    if (bold) doc.setFont("helvetica", "bold");
    else doc.setFont("helvetica", "normal");
    doc.text(label, 4, y);
    doc.text(value, 76, y, { align: "right" });
    y += 4;
  };

  putRow("Subtotal", `${formatMoney(data.subtotal)} ${data.currency}`);
  if (data.discount > 0) putRow("Discount", `-${formatMoney(data.discount)} ${data.currency}`);
  if (data.tax_amount > 0) putRow("Tax", `${formatMoney(data.tax_amount)} ${data.currency}`);
  y += 1;
  putRow("TOTAL", `${formatMoney(data.total)} ${data.currency}`, true);

  y += 2;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`Payment: ${paymentLabels[data.payment_method] ?? data.payment_method}`, 4, y);
  y += 5;

  doc.text("Thank you for your visit!", pageWidth / 2, y, { align: "center" });

  return doc.output("blob");
}

export function printInvoicePDF(data: InvoiceData) {
  const blob = generateInvoicePDF(data);
  const url = URL.createObjectURL(blob);
  const w = window.open(url);
  if (w) {
    w.onload = () => {
      w.focus();
      w.print();
    };
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function downloadInvoicePDF(data: InvoiceData) {
  const blob = generateInvoicePDF(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoice-${data.invoice_no}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
