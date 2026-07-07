"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { StatusPill } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";

function formatCents(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusTone(status: string): "purple" | "green" | "gray" | "amber" | "red" {
  if (status === "Paid") return "green";
  if (status === "Scheduled") return "gray";
  if (status === "Overdue") return "red";
  if (status === "Cancelled" || status === "Refunded") return "gray";
  return "amber";
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const invoiceId = params?.id as string;
  const shouldPrint = searchParams.get("print") === "1";

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = supabaseBrowser();
    if (!supabase || !invoiceId) {
      setLoading(false);
      return;
    }
    (async () => {
      const result = await supabase
        .from("invoices")
        .select("id, invoice_number, label, service, amount_cents, amount_paid_cents, due_date, created_at, status, notes, clients(profiles(full_name, email))")
        .eq("id", invoiceId)
        .single();
      if (result.error) {
        setError("We couldn't find that invoice.");
      } else {
        setInvoice(result.data);
      }
      setLoading(false);
    })();
  }, [invoiceId]);

  useEffect(() => {
    if (shouldPrint && !loading && invoice) {
      const timer = setTimeout(() => window.print(), 400);
      return () => clearTimeout(timer);
    }
  }, [shouldPrint, loading, invoice]);

  if (loading) {
    return <div className="p-10 text-center text-legacy-muted">Loading invoice...</div>;
  }

  if (error || !invoice) {
    return (
      <div className="p-10 text-center">
        <p className="text-legacy-muted">{error || "Invoice not found."}</p>
        <Link href="/portal" className="mt-4 inline-block font-bold text-legacy-plum">Back to portal</Link>
      </div>
    );
  }

  const balance = invoice.amount_cents - (invoice.amount_paid_cents || 0);
  const clientName = invoice.clients?.profiles?.full_name || "Valued client";
  const clientEmail = invoice.clients?.profiles?.email || "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href="/portal" className="inline-flex items-center gap-2 font-bold text-legacy-plum">
          <ArrowLeft size={18} /> Back to Billing
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-legacy-purple px-5 py-3 font-black text-white"
        >
          <Printer size={18} /> Print / Save as PDF
        </button>
      </div>

      <div className="soft-panel p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-legacy-silver pb-6">
          <div>
            <p className="text-2xl font-black text-legacy-ink">Lucille&apos;s Legacy</p>
            <p className="mt-1 text-sm text-legacy-muted">Financial education and business services</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-legacy-muted">Invoice</p>
            <p className="text-2xl font-black text-legacy-ink">{invoice.invoice_number || "-"}</p>
            <div className="mt-2"><StatusPill tone={statusTone(invoice.status)}>{invoice.status}</StatusPill></div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-sm font-bold text-legacy-muted">Billed to</p>
            <p className="mt-1 font-black text-legacy-ink">{clientName}</p>
            {clientEmail ? <p className="text-sm text-legacy-muted">{clientEmail}</p> : null}
          </div>
          <div className="sm:text-right">
            <p className="text-sm font-bold text-legacy-muted">Invoice date</p>
            <p className="mt-1 text-legacy-ink">{new Date(invoice.created_at).toLocaleDateString()}</p>
            <p className="mt-3 text-sm font-bold text-legacy-muted">Due date</p>
            <p className="mt-1 text-legacy-ink">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "-"}</p>
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-sm text-legacy-muted">
              <tr>
                <th className="border-b border-legacy-silver py-3">Service</th>
                <th className="border-b border-legacy-silver py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-4 text-legacy-ink">{invoice.service ? `${invoice.service} - ${invoice.label}` : invoice.label}</td>
                <td className="py-4 text-right font-bold text-legacy-ink">{formatCents(invoice.amount_cents)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 ml-auto max-w-xs space-y-2 border-t border-legacy-silver pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-legacy-muted">Total</span>
            <span className="font-bold text-legacy-ink">{formatCents(invoice.amount_cents)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-legacy-muted">Paid</span>
            <span className="font-bold text-legacy-ink">{formatCents(invoice.amount_paid_cents || 0)}</span>
          </div>
          <div className="flex justify-between text-base">
            <span className="font-black text-legacy-ink">Balance due</span>
            <span className="font-black text-legacy-ink">{formatCents(balance)}</span>
          </div>
        </div>

        {invoice.notes ? (
          <div className="mt-8 rounded-xl bg-legacy-lavender/60 p-4 text-sm leading-6 text-legacy-muted">
            {invoice.notes}
          </div>
        ) : null}

        <p className="mt-8 text-center text-xs text-legacy-muted">Thank you for trusting Lucille&apos;s Legacy with your financial journey.</p>
      </div>
    </div>
  );
}
