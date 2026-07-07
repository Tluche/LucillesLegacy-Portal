"use client";

import type React from "react";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  Banknote,
  Plus,
  Search,
  Users
} from "lucide-react";
import { PageHeader, StatCard, StatusPill, EmptyState } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { LUCILLES_SERVICES } from "@/lib/stripe";

const STATUS_OPTIONS = ["Due", "Partial", "Scheduled", "Paid", "Overdue", "Cancelled", "Refunded"];
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

export function AdminBillingPanel() {
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterClient, setFilterClient] = useState("");
  const [filterService, setFilterService] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [searchPayments, setSearchPayments] = useState("");

  const [newClientId, setNewClientId] = useState("");
  const [newService, setNewService] = useState(LUCILLES_SERVICES[0]);
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const [refundBusyId, setRefundBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  async function loadAll() {
    const supabase = supabaseBrowser();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const [clientsResult, invoicesResult, paymentsResult] = await Promise.all([
      supabase.from("clients").select("id, profiles(full_name)"),
      supabase
        .from("invoices")
        .select("id, invoice_number, label, service, amount_cents, amount_paid_cents, due_date, status, created_at, client_id, clients(profiles(full_name))")
        .order("due_date", { ascending: true }),
      supabase
        .from("payments")
        .select("id, amount_cents, payment_method_summary, confirmation_number, status, created_at, stripe_payment_intent_id, client_id, clients(profiles(full_name)), invoices(invoice_number)")
        .order("created_at", { ascending: false })
    ]);

    const clientRows: any[] = clientsResult.data || [];
    setClients(clientRows.map((row) => ({ id: row.id, name: row.profiles?.full_name || "Unknown client" })));
    setInvoices(invoicesResult.data || []);
    setPayments(paymentsResult.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function createInvoice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError("");
    if (!newClientId || !newLabel || !newAmount) {
      setCreateError("Please choose a client, add a description, and enter an amount.");
      return;
    }
    const amountCents = Math.round(parseFloat(newAmount) * 100);
    if (!amountCents || amountCents <= 0) {
      setCreateError("Enter a valid amount.");
      return;
    }
    const supabase = supabaseBrowser();
    if (!supabase) return;

    setCreating(true);
    const result = await supabase.from("invoices").insert({
      client_id: newClientId,
      service: newService,
      label: newLabel,
      amount_cents: amountCents,
      due_date: newDueDate || null,
      notes: newNotes || null,
      status: "Due"
    });
    setCreating(false);
    if (result.error) {
      setCreateError(result.error.message);
      return;
    }
    setNewClientId("");
    setNewLabel("");
    setNewAmount("");
    setNewDueDate("");
    setNewNotes("");
    await loadAll();
  }

  async function updateStatus(invoiceId: string, status: string) {
    setActionError("");
    setStatusBusyId(invoiceId);
    const supabase = supabaseBrowser();
    if (!supabase) return;
    const patch: any = { status };
    if (status === "Paid") {
      const invoice = invoices.find((row) => row.id === invoiceId);
      if (invoice) {
        patch.amount_paid_cents = invoice.amount_cents;
        patch.paid_at = new Date().toISOString();
      }
    }
    const result = await supabase.from("invoices").update(patch).eq("id", invoiceId);
    setStatusBusyId(null);
    if (result.error) {
      setActionError(result.error.message);
      return;
    }
    await loadAll();
  }

  async function issueRefund(paymentId: string) {
    setActionError("");
    setRefundBusyId(paymentId);
    const res = await fetch("/api/admin/payments/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId })
    });
    const json = await res.json().catch(() => ({}));
    setRefundBusyId(null);
    if (!res.ok) {
      setActionError(json.error || "Could not issue refund.");
      return;
    }
    await loadAll();
  }

  const outstandingCents = invoices
    .filter((invoice) => !CLOSED_STATUSES.includes(invoice.status))
    .reduce((sum, invoice) => sum + (invoice.amount_cents - (invoice.amount_paid_cents || 0)), 0);
  const overdueCount = invoices.filter((invoice) => invoice.status === "Overdue").length;
  const paidCount = invoices.filter((invoice) => invoice.status === "Paid").length;

  const filteredInvoices = invoices.filter((invoice) => {
    if (filterClient && invoice.client_id !== filterClient) return false;
    if (filterService && invoice.service !== filterService) return false;
    if (filterStatus && invoice.status !== filterStatus) return false;
    if (filterFrom && (!invoice.due_date || invoice.due_date < filterFrom)) return false;
    if (filterTo && (!invoice.due_date || invoice.due_date > filterTo)) return false;
    return true;
  });

  const filteredPayments = payments.filter((payment) => {
    if (!searchPayments) return true;
    const query = searchPayments.toLowerCase();
    const clientName = payment.clients?.profiles?.full_name || "";
    return (
      (payment.confirmation_number || "").toLowerCase().includes(query) ||
      clientName.toLowerCase().includes(query)
    );
  });

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Billing & Payments"
        description="Create invoices, track balances, and manage payments across every client."
      />

      {actionError ? <p className="mb-4 rounded-lg bg-legacy-lavender p-3 text-sm text-legacy-plum">{actionError}</p> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Outstanding balance" value={formatCents(outstandingCents)} note="Total currently owed across all clients." icon={Banknote} />
        <StatCard label="Overdue invoices" value={String(overdueCount)} note="Invoices past their due date." icon={AlertCircle} />
        <StatCard label="Paid invoices" value={String(paidCount)} note="Total invoices marked paid." icon={Banknote} />
        <StatCard label="Clients" value={String(clients.length)} note="Clients with portal access." icon={Users} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_22rem]">
        <section className="soft-panel p-5">
          <h2 className="text-xl font-black text-legacy-ink">Invoices</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <select value={filterClient} onChange={(event) => setFilterClient(event.target.value)} className="rounded-lg border border-legacy-silver px-3 py-2 text-sm">
              <option value="">All clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
            <select value={filterService} onChange={(event) => setFilterService(event.target.value)} className="rounded-lg border border-legacy-silver px-3 py-2 text-sm">
              <option value="">All services</option>
              {LUCILLES_SERVICES.map((service) => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>
            <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="rounded-lg border border-legacy-silver px-3 py-2 text-sm">
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <input type="date" value={filterFrom} onChange={(event) => setFilterFrom(event.target.value)} className="rounded-lg border border-legacy-silver px-3 py-2 text-sm" />
            <input type="date" value={filterTo} onChange={(event) => setFilterTo(event.target.value)} className="rounded-lg border border-legacy-silver px-3 py-2 text-sm" />
          </div>

          <div className="mt-4 overflow-x-auto">
            {loading ? (
              <p className="text-sm text-legacy-muted">Loading invoices...</p>
            ) : filteredInvoices.length === 0 ? (
              <EmptyState title="No invoices match" text="Try adjusting your filters or create a new invoice." />
            ) : (
              <table className="w-full min-w-[52rem] text-left">
                <thead className="text-sm text-legacy-muted">
                  <tr>
                    <th className="py-3">Invoice #</th>
                    <th>Client</th>
                    <th>Service</th>
                    <th>Due date</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-legacy-silver">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="py-4 font-bold text-legacy-ink">{invoice.invoice_number || "-"}</td>
                      <td className="text-legacy-muted">{invoice.clients?.profiles?.full_name || "Unknown client"}</td>
                      <td className="text-legacy-muted">{invoice.service || "-"}</td>
                      <td className="text-legacy-muted">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "-"}</td>
                      <td className="font-black text-legacy-ink">{formatCents(invoice.amount_cents - (invoice.amount_paid_cents || 0))}</td>
                      <td>
                        <select
                          value={invoice.status}
                          onChange={(event) => updateStatus(invoice.id, event.target.value)}
                          disabled={statusBusyId === invoice.id}
                          className="rounded-lg border border-legacy-silver px-2 py-2 text-sm"
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="soft-panel p-5">
          <h2 className="text-xl font-black text-legacy-ink">Create invoice</h2>
          <form onSubmit={createInvoice} className="mt-4 grid gap-3">
            <select value={newClientId} onChange={(event) => setNewClientId(event.target.value)} className="rounded-lg border border-legacy-silver px-3 py-3" required>
              <option value="">Choose a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
            <select value={newService} onChange={(event) => setNewService(event.target.value)} className="rounded-lg border border-legacy-silver px-3 py-3">
              {LUCILLES_SERVICES.map((service) => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>
            <input
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
              placeholder="What is this invoice for?"
              className="rounded-lg border border-legacy-silver px-3 py-3"
              required
            />
            <input
              value={newAmount}
              onChange={(event) => setNewAmount(event.target.value)}
              placeholder="Amount (e.g. 150.00)"
              type="number"
              step="0.01"
              min="0"
              className="rounded-lg border border-legacy-silver px-3 py-3"
              required
            />
            <label className="grid gap-2 text-sm font-bold text-legacy-ink">
              Due date
              <input
                value={newDueDate}
                onChange={(event) => setNewDueDate(event.target.value)}
                type="date"
                className="rounded-lg border border-legacy-silver px-3 py-3 font-normal"
              />
            </label>
            <textarea
              value={newNotes}
              onChange={(event) => setNewNotes(event.target.value)}
              placeholder="Notes (optional)"
              rows={3}
              className="rounded-lg border border-legacy-silver px-3 py-3"
            />
            <button disabled={creating} className="inline-flex items-center justify-center gap-2 rounded-lg bg-legacy-purple px-5 py-3 font-black text-white disabled:opacity-50">
              <Plus size={18} /> {creating ? "Creating..." : "Create invoice"}
            </button>
            {createError ? <p className="text-sm text-legacy-plum">{createError}</p> : null}
          </form>
        </section>
      </div>

      <section className="soft-panel mt-5 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black text-legacy-ink">Payment history</h2>
          <div className="flex items-center gap-2 rounded-lg border border-legacy-silver px-3 py-2">
            <Search size={16} className="text-legacy-muted" />
            <input
              value={searchPayments}
              onChange={(event) => setSearchPayments(event.target.value)}
              placeholder="Search by client or confirmation #"
              className="border-0 bg-transparent text-sm outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          {filteredPayments.length === 0 ? (
            <p className="text-sm text-legacy-muted">No payments found.</p>
          ) : (
            <table className="w-full min-w-[56rem] text-left">
              <thead className="text-sm text-legacy-muted">
                <tr>
                  <th className="py-3">Date</th>
                  <th>Client</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Confirmation #</th>
                  <th>Invoice</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-legacy-silver">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="py-4 text-legacy-muted">{new Date(payment.created_at).toLocaleDateString()}</td>
                    <td className="text-legacy-muted">{payment.clients?.profiles?.full_name || "Unknown client"}</td>
                    <td className="font-black text-legacy-ink">{formatCents(payment.amount_cents)}</td>
                    <td className="text-legacy-muted">{payment.payment_method_summary || "-"}</td>
                    <td className="text-legacy-muted">{payment.confirmation_number || "-"}</td>
                    <td className="text-legacy-muted">{payment.invoices?.invoice_number || "-"}</td>
                    <td><StatusPill tone={payment.status === "succeeded" ? "green" : payment.status === "refunded" ? "gray" : "red"}>{payment.status}</StatusPill></td>
                    <td className="text-right">
                      {payment.status === "succeeded" && payment.stripe_payment_intent_id ? (
                        <button
                          onClick={() => issueRefund(payment.id)}
                          disabled={refundBusyId === payment.id}
                          className="rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-plum disabled:opacity-50"
                        >
                          {refundBusyId === payment.id ? "..." : "Refund"}
                        </button>
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
    </>
  );
}
