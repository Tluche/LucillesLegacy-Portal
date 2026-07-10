"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { RefreshCw, Send, Ban, Download, History, X } from "lucide-react"
import { PageHeader, StatusPill, EmptyState } from "@/components/ui"
import { supabaseBrowser } from "@/lib/supabase/client"

type ClientOption = {
  id: string
  profiles: { full_name: string | null } | null
}

type TemplateOption = {
  id: string
  name: string
  version: number | null
  service_slug: string | null
}

type SignatureRequestSummary = {
  id: string
  status: string
  provider: string | null
  envelope_id: string | null
  sent_at: string | null
  viewed_at: string | null
  signed_at: string | null
  declined_at: string | null
  expires_at: string | null
  voided_at: string | null
  signed_document_path: string | null
  audit_trail_path: string | null
}

type TrackedDoc = {
  id: string
  name: string
  status: string
  signature_request_id: string | null
  clients: {
    id: string
    profiles: { full_name: string | null; email: string | null } | null
  } | null
  signature_requests: SignatureRequestSummary | null
}

type SignatureEvent = {
  id: string
  event_type: string
  created_at: string
}

function statusTone(status: string | null | undefined): "purple" | "green" | "gray" | "amber" | "red" {
  const value = (status || "").toLowerCase()
  if (value === "signed" || value === "completed") return "green"
  if (value === "declined" || value === "voided" || value === "error") return "red"
  if (value === "sent" || value === "viewed" || value === "creating") return "amber"
  if (value === "expired") return "gray"
  return "purple"
}

export function AdminSignatures() {
  const supabase = supabaseBrowser()
  const [clients, setClients] = useState<ClientOption[]>([])
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [tracked, setTracked] = useState<TrackedDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState("")
  const [assignSuccess, setAssignSuccess] = useState("")

  const [voidTarget, setVoidTarget] = useState<TrackedDoc | null>(null)
  const [voidReason, setVoidReason] = useState("")
  const [voidLoading, setVoidLoading] = useState(false)

  const [historyTarget, setHistoryTarget] = useState<TrackedDoc | null>(null)
  const [historyEvents, setHistoryEvents] = useState<SignatureEvent[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const [busyId, setBusyId] = useState("")
  const [rowError, setRowError] = useState("")

  async function loadData() {
    setLoading(true)
    const [clientsRes, templatesRes, trackedRes] = await Promise.all([
      supabase
        .from("clients")
        .select("id, profiles(full_name)")
        .eq("status", "Active")
        .order("id"),
      supabase
        .from("master_documents")
        .select("id, name, version, service_slug")
        .eq("document_type", "signature_required")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("documents")
        .select(
          "id, name, status, signature_request_id, clients(id, profiles(full_name, email)), signature_requests(id, status, provider, envelope_id, sent_at, viewed_at, signed_at, declined_at, expires_at, voided_at, signed_document_path, audit_trail_path)"
        )
        .not("signature_request_id", "is", null)
        .order("created_at", { ascending: false }),
    ])

    setClients((clientsRes.data as unknown as ClientOption[]) || [])
    setTemplates((templatesRes.data as unknown as TemplateOption[]) || [])
    setTracked((trackedRes.data as unknown as TrackedDoc[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  async function assignAndSend(event: React.FormEvent) {
    event.preventDefault()
    setAssignError("")
    setAssignSuccess("")
    if (!selectedClient || !selectedTemplate) {
      setAssignError("Choose a client and an agreement template.")
      return
    }
    setAssigning(true)
    try {
      const template = templates.find((item) => item.id === selectedTemplate)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data: newDoc, error: insertError } = await supabase
        .from("documents")
        .insert({
          client_id: selectedClient,
          uploaded_by: user?.id ?? null,
          name: template?.name ?? "Agreement",
          storage_path: null,
          category: "General",
          status: "Assigned",
          folder: "Agreements",
          visible_to_client: true,
          master_document_id: selectedTemplate,
          service_slug: template?.service_slug ?? null,
        })
        .select("id")
        .single()

      if (insertError || !newDoc) {
        setAssignError(insertError?.message || "Could not create the document record.")
        setAssigning(false)
        return
      }

      const response = await fetch("/api/signatures/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: newDoc.id }),
      })
      const result = await response.json()

      if (!response.ok || result.error) {
        setAssignError(result.error || "Could not send the signature request.")
        setAssigning(false)
        return
      }

      setAssignSuccess("Signature request sent.")
      setSelectedClient("")
      setSelectedTemplate("")
      await loadData()
    } finally {
      setAssigning(false)
    }
  }

  async function resend(doc: TrackedDoc) {
    if (!doc.signature_request_id) return
    setRowError("")
    setBusyId(doc.id)
    const response = await fetch("/api/signatures/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signatureRequestId: doc.signature_request_id }),
    })
    const result = await response.json()
    if (!response.ok || result.error) {
      setRowError(result.error || "Could not resend the request.")
    }
    setBusyId("")
    await loadData()
  }

  function openVoid(doc: TrackedDoc) {
    setVoidReason("")
    setVoidTarget(doc)
  }

  async function confirmVoid() {
    if (!voidTarget?.signature_request_id) return
    setVoidLoading(true)
    const response = await fetch("/api/signatures/void", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signatureRequestId: voidTarget.signature_request_id, reason: voidReason || undefined }),
    })
    const result = await response.json()
    setVoidLoading(false)
    if (!response.ok || result.error) {
      setRowError(result.error || "Could not void the request.")
      return
    }
    setVoidTarget(null)
    await loadData()
  }

  async function downloadFile(path: string | null) {
    if (!path) return
    const { data, error } = await supabase.storage.from("SIGNED DOCUMENTS").createSignedUrl(path, 60)
    if (error || !data?.signedUrl) {
      setRowError(error?.message || "Could not create a download link.")
      return
    }
    window.open(data.signedUrl, "_blank")
  }

  async function openHistory(doc: TrackedDoc) {
    if (!doc.signature_request_id) return
    setHistoryTarget(doc)
    setHistoryLoading(true)
    const { data } = await supabase
      .from("signature_events")
      .select("id, event_type, created_at")
      .eq("signature_request_id", doc.signature_request_id)
      .order("created_at", { ascending: true })
    setHistoryEvents((data as unknown as SignatureEvent[]) || [])
    setHistoryLoading(false)
  }

  function closeHistory() {
    setHistoryTarget(null)
    setHistoryEvents([])
  }

  function formatDate(value: string | null) {
    if (!value) return null
    return new Date(value).toLocaleString()
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="E-signatures"
        description="Assign agreements for signature, track status, and manage the signing lifecycle."
      />

      <div className="grid gap-5">
        <form onSubmit={assignAndSend} className="soft-panel grid gap-3 p-5 sm:grid-cols-3 sm:items-end">
          <div className="grid gap-1">
            <label className="text-sm font-bold text-legacy-ink">Client</label>
            <select
              value={selectedClient}
              onChange={(event) => setSelectedClient(event.target.value)}
              className="rounded-lg border border-legacy-silver px-3 py-3"
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.profiles?.full_name || client.id}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1">
            <label className="text-sm font-bold text-legacy-ink">Agreement template</label>
            <select
              value={selectedTemplate}
              onChange={(event) => setSelectedTemplate(event.target.value)}
              className="rounded-lg border border-legacy-silver px-3 py-3"
            >
              <option value="">Select a template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                  {template.version ? " (v" + template.version + ")" : ""}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={assigning}
            className="rounded-lg bg-legacy-purple px-5 py-3 font-black text-white disabled:opacity-50"
          >
            {assigning ? "Sending..." : "Assign & send"}
          </button>
          {assignError ? <p className="text-sm text-legacy-plum sm:col-span-3">{assignError}</p> : null}
          {assignSuccess ? <p className="text-sm text-legacy-purple sm:col-span-3">{assignSuccess}</p> : null}
        </form>

        <div className="soft-panel p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-black text-legacy-ink">Signature requests</h2>
            <button
              onClick={loadData}
              className="flex items-center gap-2 rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-ink"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>

          {rowError ? <p className="mb-3 text-sm text-legacy-plum">{rowError}</p> : null}

          {loading ? (
            <p className="text-sm text-legacy-muted">Loading...</p>
          ) : tracked.length === 0 ? (
            <EmptyState title="No signature requests yet" text="Assign an agreement above to get started." />
          ) : (
            <div className="grid gap-3">
              {tracked.map((doc) => {
                const request = doc.signature_requests
                const status = request?.status || doc.status
                const canManage = status === "sent" || status === "viewed"
                return (
                  <div key={doc.id} className="rounded-xl border border-legacy-silver p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-legacy-ink">{doc.name}</p>
                        <p className="text-sm text-legacy-muted">
                          {doc.clients?.profiles?.full_name || "Unknown client"}
                          {doc.clients?.profiles?.email ? " · " + doc.clients.profiles.email : ""}
                        </p>
                      </div>
                      <StatusPill tone={statusTone(status)}>{status}</StatusPill>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-legacy-muted">
                      {formatDate(request?.sent_at ?? null) ? <span>Sent: {formatDate(request?.sent_at ?? null)}</span> : null}
                      {formatDate(request?.viewed_at ?? null) ? <span>Viewed: {formatDate(request?.viewed_at ?? null)}</span> : null}
                      {formatDate(request?.signed_at ?? null) ? <span>Signed: {formatDate(request?.signed_at ?? null)}</span> : null}
                      {formatDate(request?.declined_at ?? null) ? <span>Declined: {formatDate(request?.declined_at ?? null)}</span> : null}
                      {formatDate(request?.voided_at ?? null) ? <span>Voided: {formatDate(request?.voided_at ?? null)}</span> : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {canManage ? (
                        <button
                          onClick={() => resend(doc)}
                          disabled={busyId === doc.id}
                          className="flex items-center gap-1 rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-ink disabled:opacity-50"
                        >
                          <Send className="h-4 w-4" /> Resend
                        </button>
                      ) : null}
                      {canManage ? (
                        <button
                          onClick={() => openVoid(doc)}
                          className="flex items-center gap-1 rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-plum"
                        >
                          <Ban className="h-4 w-4" /> Void
                        </button>
                      ) : null}
                      {request?.signed_document_path ? (
                        <button
                          onClick={() => downloadFile(request.signed_document_path)}
                          className="flex items-center gap-1 rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-ink"
                        >
                          <Download className="h-4 w-4" /> Signed document
                        </button>
                      ) : null}
                      {request?.audit_trail_path ? (
                        <button
                          onClick={() => downloadFile(request.audit_trail_path)}
                          className="flex items-center gap-1 rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-ink"
                        >
                          <Download className="h-4 w-4" /> Certificate
                        </button>
                      ) : null}
                      <button
                        onClick={() => openHistory(doc)}
                        className="flex items-center gap-1 rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-ink"
                      >
                        <History className="h-4 w-4" /> Event history
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {voidTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-soft">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-legacy-ink">Void signature request</h2>
              <button onClick={() => setVoidTarget(null)} className="text-legacy-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-3 text-sm text-legacy-muted">{voidTarget.name}</p>
            <textarea
              value={voidReason}
              onChange={(event) => setVoidReason(event.target.value)}
              placeholder="Reason (optional)"
              className="mb-4 w-full rounded-lg border border-legacy-silver p-3 text-sm"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setVoidTarget(null)}
                className="rounded-lg border border-legacy-silver px-4 py-2 text-sm font-bold text-legacy-ink"
              >
                Cancel
              </button>
              <button
                onClick={confirmVoid}
                disabled={voidLoading}
                className="rounded-lg bg-legacy-plum px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {voidLoading ? "Voiding..." : "Void request"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {historyTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-soft">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-legacy-ink">Event history</h2>
              <button onClick={closeHistory} className="text-legacy-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            {historyLoading ? (
              <p className="text-sm text-legacy-muted">Loading...</p>
            ) : historyEvents.length === 0 ? (
              <p className="text-sm text-legacy-muted">No events recorded yet.</p>
            ) : (
              <ul className="grid gap-2">
                {historyEvents.map((item) => (
                  <li key={item.id} className="rounded-lg border border-legacy-silver p-3 text-sm">
                    <span className="font-bold text-legacy-ink">{item.event_type}</span>
                    <span className="ml-2 text-legacy-muted">{formatDate(item.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
