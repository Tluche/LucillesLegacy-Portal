"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Download,
  Eye,
  Receipt,
  Repeat
} from "lucide-react";
import { PageHeader, StatCard, StatusPill, EmptyState } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";

type InvoiceRow = {
  id: string;
  invoice_number: string | null;
  label: string;
  service: string | null;
  amount_cents: number;
  amount_paid_cents: number | null;
  due_date: string | null;
  created_at: string;
  status: string;
};

type PaymentRow = {
  id: string;
  amount_cents: number;
  payment_method_summary: string | null;
  confirmation_number: string | null;
  status: string;
  created_at: string;
  receipt_url: string | null;
  invoices: { invoice_number: string | null; label: string } | null;
};

type PaymentMethodRow = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
};

const CLOSED_STATUSES = ["Paid", "Cancelled", "Refunded"];

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

export function ClientBilling({ clientId }: { clientId: string | null }) {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [methods, setMethods] = useState<PaymentMethodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [methodsLoading, setMethodsLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [payingAll, setPayingAll] = useState(false);
  const [payingIds, setPayingIds] = useState<Set<string>>(new Set());
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadBillingData() {
    const supabase = supabaseBrowser();
    if (!supabase || !clientId) {
      setLoading(false);
      return;
    }
    const [invoicesResult, paymentsResult] = await Promise.all([
      supabase
        .from("invoices")
        .select("id, invoice_number, label, service, amount_cents, amount_paid_cents, due_date, created_at, status")
        .eq("client_id", clientId)
        .order("due_date", { ascending: true }),
      supabase
        .from("payments")
        .select("id, amount_cents, payment_method_summary, confirmation_number, status, created_at, receipt_url, invoices(invoice_number, label)")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
    ]);

    if (!invoicesResult.error) setInvoices((invoicesResult.data as any) || []);
    if (!paymentsResult.error) setPayments((paymentsResult.data as any) || []);
    setLoading(false);
  }

  async function loadPaymentMethods() {
    setMethodsLoading(true);
    try {
      const res = await fetch("/api/billing/payment-methods");
      if (res.ok) {
        const json = await res.json();
        setMethods(json.paymentMethods || []);
      }
    } catch {
      // ignore - payment methods are optional to display
    }
    setMethodsLoading(false);
  }

  useEffect(() => {
    loadBillingData();
    loadPaymentMethods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const openInvoices = invoices.filter((invoice) => !CLOSED_STATUSES.includes(invoice.status));
  const balanceCents = openInvoices.reduce(
    (sum, invoice) => sum + (invoice.amount_cents - (invoice.amount_paid_cents || 0)),
    0
  );
  const nextDue = openInvoices[0];
  const scheduled = invoices.find((invoice) => invoice.status === "Scheduled");

  const overallStatus =
    invoices.length === 0
      ? "No invoices"
      : openInvoices.length === 0
      ? "Paid"
      : openInvoices.some((invoice) => invoice.status === "Overdue")
      ? "Overdue"
      : openInvoices.some((invoice) => invoice.status === "Partial")
      ? "Partial"
      : "Due";

  async function startCheckout(invoiceIds: string[]) {
    setError("");
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceIds })
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.url) {
      window.location.href = json.url;
    } else {
      setError(json.error || "Could not start checkout. Please try again.");
    }
  }

  async function handlePayAll() {
    if (openInvoices.length === 0) return;
    setPayingAll(true);
    await startCheckout(openInvoices.map((invoice) => invoice.id));
    setPayingAll(false);
  }

  async function handlePayOne(invoiceId: string) {
    setPayingIds((prev) => new Set(prev).add(invoiceId));
    await startCheckout([invoiceId]);
    setPayingIds((prev) => {
      const next = new Set(prev);
      next.delete(invoiceId);
      return next;
    });
  }

  async function handlePaySelected() {
    if (selected.size === 0) return;
    setPayingAll(true);
    await startCheckout(Array.from(selected));
    setPayingAll(false);
  }

  function toggleSelected(invoiceId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(invoiceId)) next.delete(invoiceId);
      else next.add(invoiceId);
      return next;
    });
  }

  async function openBillingPortal() {
    setPortalLoading(true);
    setError("");
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.url) {
      window.location.href = json.url;
    } else {
      setError(json.error || "Could not open the payment methods portal.");
    }
    setPortalLoading(false);
  }

  const selectedBalanceCents = invoices
    .filter((invoice) => selected.has(invoice.id))
    .reduce((sum, invoice) => sum + (invoice.amount_cents - (invoice.amount_paid_cents || 0)), 0);

  return (
    <>
      <PageHeader
        eyebrow="Billing & Payments"
        title="Billing & Payments"
        description="See what you owe, what you've already paid, and what's coming next. One click takes you to a secure Stripe checkout."
        action={
          <button
            onClick={handlePayAll}
            disabled={openInvoices.length === 0 || payingAll}
            className="rounded-lg bg-legacy-purple px-5 py-3 font-black text-white disabled:opacity-50"
          >
            {payingAll ? "Starting checkout..." : "Pay Now"}
          </button>
        }
      />

      {error ? <p className="mb-4 rounded-lg bg-legacy-lavender p-3 text-sm text-legacy-plum">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Current balance" value={formatCents(balanceCents)} note={openInvoices.length > 0 ? `${openInvoices.length} open invoice${openInvoices.length > 1 ? "s" : ""}.` : "You're all paid up."} icon={Banknote} />
        <StatCard label="Amount due" value={nextDue ? formatCents(nextDue.amount_cents - (nextDue.amount_paid_cents || 0)) : "$0.00"} note={nextDue ? `Due ${nextDue.due_date ? new Date(nextDue.due_date).toLocaleDateString() : "soon"}` : "Nothing due right now."} icon={CalendarDays} />
        <StatCard label="Payment status" value={overallStatus} note="Updates automatically as payments are received." icon={CheckCircle2} />
        <StatCard label="Next scheduled" value={scheduled ? new Date(scheduled.due_date || scheduled.created_at).toLocaleDateString() : "None"} note={scheduled ? scheduled.label : "No scheduled payments."} icon={Repeat} />
      </div>

      <section className="soft-panel mt-5 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black text-legacy-ink">Invoices</h2>
          {selected.size > 0 ? (
            <button
              onClick={handlePaySelected}
              disabled={payingAll}
              className="rounded-lg bg-legacy-purple px-4 py-2 text-sm font-black text-white disabled:opacity-50"
            >
              {payingAll ? "Starting checkout..." : `Pay selected (${formatCents(selectedBalanceCents)})`}
            </button>
          ) : null}
        </div>
        {loading ? (
          <p className="text-sm text-legacy-muted">Loading invoices...</p>
        ) : invoices.length === 0 ? (
          <EmptyState title="No invoices yet" text="Invoices will appear here as soon as they're created." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left">
              <thead className="text-sm text-legacy-muted">
                <tr>
                  <th className="w-8 py-3"></th>
                  <th>Invoice #</th>
                  <th>Service</th>
                  <th>Invoice date</th>
                  <th>Due date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-legacy-silver">
                {invoices.map((invoice) => {
                  const payable = !CLOSED_STATUSES.includes(invoice.status);
                  const balance = invoice.amount_cents - (invoice.amount_paid_cents || 0);
                  return (
                    <tr key={invoice.id}>
                      <td className="py-4">
                        {payable ? (
                          <input
                            type="checkbox"
                            checked={selected.has(invoice.id)}
                            onChange={() => toggleSelected(invoice.id)}
                            className="h-4 w-4 accent-legacy-purple"
                          />
                        ) : null}
                      </td>
                      <td className="font-bold text-legacy-ink">{invoice.invoice_number || "-"}</td>
                      <td className="text-legacy-muted">{invoice.service || invoice.label}</td>
                      <td className="text-legacy-muted">{new Date(invoice.created_at).toLocaleDateString()}</td>
                      <td className="text-legacy-muted">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "-"}</td>
                      <td className="font-black text-legacy-ink">{formatCents(balance)}</td>
                      <td><StatusPill tone={statusTone(invoice.status)}>{invoice.status}</StatusPill></td>
                      <td className="text-right">
                        <div className="flex justify-end flex-wrap gap-2">
                          <Link href={`/portal/invoice/${invoice.id}`} className="inline-flex items-center gap-1 rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-plum">
                            <Eye size={16} /> View
                          </Link>
                          <Link href={`/portal/invoice/${invoice.id}?print=1`} className="inline-flex items-center gap-1 rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-plum">
                            <Download size={16} /> PDF
                          </Link>
                          {payable ? (
                            <button
                              onClick={() => handlePayOne(invoice.id)}
                              disabled={payingIds.has(invoice.id)}
                              className="rounded-lg bg-legacy-purple px-3 py-2 text-sm font-black text-white disabled:opacity-50"
                            >
                              {payingIds.has(invoice.id) ? "..." : "Pay"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="soft-panel mt-5 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black text-legacy-ink">Payment methods</h2>
          <button
            onClick={openBillingPortal}
            disabled={portalLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-legacy-silver px-4 py-2 text-sm font-bold text-legacy-plum disabled:opacity-50"
          >
            <CreditCard size={16} /> {portalLoading ? "Opening..." : "Manage payment methods"}
          </button>
        </div>
        {methodsLoading ? (
          <p className="text-sm text-legacy-muted">Loading payment methods...</p>
        ) : methods.length === 0 ? (
          <EmptyState title="No saved payment method" text="Add a payment method securely through the Stripe portal above." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {methods.map((method) => (
              <div key={method.id} className="flex items-center justify-between gap-3 rounded-xl border border-legacy-silver p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-legacy-lavender text-legacy-purple">
                    <CreditCard size={20} />
                  </span>
                  <div>
                    <p className="font-black text-legacy-ink capitalize">{method.brand} **** {method.last4}</p>
                    <p className="text-sm text-legacy-muted">Expires {method.expMonth}/{method.expYear}</p>
                  </div>
                </div>
                {method.isDefault ? <StatusPill>Default</StatusPill> : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="soft-panel mt-5 p-5">
        <h2 className="text-xl font-black text-legacy-ink">Payment history</h2>
        <div className="mt-4 overflow-x-auto">
          {payments.length === 0 ? (
            <p className="text-sm text-legacy-muted">No payments yet.</p>
          ) : (
            <table className="w-full min-w-[48rem] text-left">
              <thead className="text-sm text-legacy-muted">
                <tr>
                  <th className="py-3">Date</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Confirmation #</th>
                  <th>Invoice</th>
                  <th>Status</th>
                  <th className="text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-legacy-silver">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="py-4 text-legacy-muted">{new Date(payment.created_at).toLocaleDateString()}</td>
                    <td className="font-black text-legacy-ink">{formatCents(payment.amount_cents)}</td>
                    <td className="text-legacy-muted">{payment.payment_method_summary || "-"}</td>
                    <td className="text-legacy-muted">{payment.confirmation_number || "-"}</td>
                    <td className="text-legacy-muted">{payment.invoices?.invoice_number || "-"}</td>
                    <td><StatusPill tone={payment.status === "succeeded" ? "green" : payment.status === "refunded" ? "gray" : "red"}>{payment.status}</StatusPill></td>
                    <td className="text-right">
                      {payment.receipt_url ? (
                        <a href={payment.receipt_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-plum">
                          <Receipt size={16} /> Receipt
                        </a>
                      ) : (
                        <span className="text-sm text-legacy-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="soft-panel mt-5 p-5">
        <h2 className="text-xl font-black text-legacy-ink">Memberships</h2>
        <p className="mt-2 text-sm leading-6 text-legacy-muted">
          Recurring membership plans aren't active yet. When they launch, you'll be able to manage your subscription right here.
        </p>
      </section>
    </>
  );
}
