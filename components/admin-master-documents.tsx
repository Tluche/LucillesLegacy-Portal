"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { FileText, RefreshCw, Upload } from "lucide-react"
import { PageHeader } from "@/components/ui"
import { supabaseBrowser } from "@/lib/supabase/client"

const MASTER_CATEGORIES = [
  "General Onboarding",
  "Agreements",
  "Welcome Packets",
  "Service Guides",
  "Checklists",
  "Resources",
  "Billing",
  "Completed Work Templates"
]

type ServiceOption = { slug: string; name: string }

type MasterDocument = {
  id: string
  name: string
  category: string
  service_slug: string | null
  description: string | null
  storage_path: string | null
  version: number
  is_active: boolean
  updated_at: string
}

export function AdminMasterDocuments() {
  const [docs, setDocs] = useState<MasterDocument[]>([])
  const [services, setServices] = useState<ServiceOption[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [filterCategory, setFilterCategory] = useState("All")
  const [filterService, setFilterService] = useState("All")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<{ name: string; category: string; service_slug: string; description: string }>({
    name: "",
    category: MASTER_CATEGORIES[0],
    service_slug: "",
    description: ""
  })

  async function loadData() {
    const supabase = supabaseBrowser()
    if (!supabase) {
      setLoading(false)
      return
    }
    setLoading(true)
    const [docsResult, servicesResult] = await Promise.all([
      supabase.from("master_documents").select("*").order("updated_at", { ascending: false }),
      supabase.from("services").select("slug, name").order("name", { ascending: true })
    ])
    if (!docsResult.error) setDocs((docsResult.data || []) as MasterDocument[])
    if (!servicesResult.error) setServices((servicesResult.data || []) as ServiceOption[])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  async function addDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    const form = event.currentTarget
    const formData = new FormData(form)
    const file = formData.get("file") as File | null
    const name = String(formData.get("name") || "")
    const category = String(formData.get("category") || MASTER_CATEGORIES[0])
    const serviceSlug = String(formData.get("service_slug") || "")
    const description = String(formData.get("description") || "")

    if (!name) return

    const supabase = supabaseBrowser()
    if (!supabase) {
      setError("Master document upload is currently unavailable.")
      return
    }

    setUploading(true)
    let storagePath: string | null = null

    if (file && file.name) {
      const path = `${category}/${Date.now()}-${file.name}`
      const uploadResult = await supabase.storage.from("MASTER DOCUMENTS").upload(path, file)
      if (uploadResult.error) {
        setError(uploadResult.error.message)
        setUploading(false)
        return
      }
      storagePath = path
    }

    const insertResult = await supabase.from("master_documents").insert({
      name,
      category,
      service_slug: serviceSlug || null,
      description: description || null,
      storage_path: storagePath,
      version: 1,
      is_active: true
    })

    setUploading(false)
    if (insertResult.error) {
      setError(insertResult.error.message)
      return
    }

    form.reset()
    await loadData()
  }

  async function replaceFile(doc: MasterDocument, file: File) {
    const supabase = supabaseBrowser()
    if (!supabase) return
    const path = `${doc.category}/${Date.now()}-${file.name}`
    const uploadResult = await supabase.storage.from("MASTER DOCUMENTS").upload(path, file)
    if (uploadResult.error) {
      setError(uploadResult.error.message)
      return
    }
    await supabase
      .from("master_documents")
      .update({ storage_path: path, version: doc.version + 1, updated_at: new Date().toISOString() })
      .eq("id", doc.id)
    await loadData()
  }

  async function toggleActive(doc: MasterDocument) {
    const supabase = supabaseBrowser()
    if (!supabase) return
    await supabase
      .from("master_documents")
      .update({ is_active: !doc.is_active, updated_at: new Date().toISOString() })
      .eq("id", doc.id)
    await loadData()
  }

  async function viewDocument(storagePath: string | null) {
    if (!storagePath) return
    const supabase = supabaseBrowser()
    if (!supabase) return
    const result = await supabase.storage.from("MASTER DOCUMENTS").createSignedUrl(storagePath, 60)
    if (result.data?.signedUrl) {
      window.open(result.data.signedUrl, "_blank")
    }
  }

  function startEdit(doc: MasterDocument) {
    setEditingId(doc.id)
    setEditDraft({
      name: doc.name,
      category: doc.category,
      service_slug: doc.service_slug || "",
      description: doc.description || ""
    })
  }

  async function saveEdit(doc: MasterDocument) {
    const supabase = supabaseBrowser()
    if (!supabase) return
    await supabase
      .from("master_documents")
      .update({
        name: editDraft.name,
        category: editDraft.category,
        service_slug: editDraft.service_slug || null,
        description: editDraft.description || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", doc.id)
    setEditingId(null)
    await loadData()
  }

  const filteredDocs = docs.filter((doc) => {
    const categoryMatch = filterCategory === "All" || doc.category === filterCategory
    const serviceMatch =
      filterService === "All" ||
      (filterService === "General" && !doc.service_slug) ||
      doc.service_slug === filterService
    return categoryMatch && serviceMatch
  })

  function serviceName(slug: string | null) {
    if (!slug) return "General"
    return services.find((service) => service.slug === slug)?.name || slug
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Master document library"
        description="Central library of business documents. Upload placeholders now; replace with final files during the next phase."
      />
      <section className="grid gap-5 xl:grid-cols-[24rem_1fr]">
        <form onSubmit={addDocument} className="soft-panel grid content-start gap-4 p-5">
          <h2 className="text-xl font-black text-legacy-ink">Add master document</h2>
          <input name="name" className="rounded-lg border border-legacy-silver px-3 py-3" placeholder="Document name" required />
          <select name="category" className="rounded-lg border border-legacy-silver px-3 py-3" defaultValue={MASTER_CATEGORIES[0]}>
            {MASTER_CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
          <select name="service_slug" className="rounded-lg border border-legacy-silver px-3 py-3" defaultValue="">
            <option value="">General (all clients)</option>
            {services.map((service) => (
              <option key={service.slug} value={service.slug}>
                {service.name}
              </option>
            ))}
          </select>
          <textarea
            name="description"
            className="rounded-lg border border-legacy-silver px-3 py-3"
            rows={3}
            placeholder="Description (internal use)"
          />
          <label className="grid gap-3 rounded-2xl border border-dashed border-legacy-purple bg-legacy-lavender/60 p-5 text-center font-bold text-legacy-plum">
            <Upload className="mx-auto" size={28} />
            Select a file (optional placeholder)
            <input name="file" type="file" className="sr-only" />
          </label>
          <button
            disabled={uploading}
            className="rounded-lg bg-legacy-purple px-5 py-3 font-black text-white disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Add document"}
          </button>
          {error ? <p className="rounded-lg bg-legacy-lavender p-3 text-sm text-legacy-plum">{error}</p> : null}
        </form>

        <div className="soft-panel p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-black text-legacy-ink">All master documents</h2>
            <div className="flex flex-wrap gap-2">
              <select
                value={filterCategory}
                onChange={(event) => setFilterCategory(event.target.value)}
                className="rounded-lg border border-legacy-silver px-3 py-2 text-sm"
              >
                <option>All</option>
                {MASTER_CATEGORIES.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
              <select
                value={filterService}
                onChange={(event) => setFilterService(event.target.value)}
                className="rounded-lg border border-legacy-silver px-3 py-2 text-sm"
              >
                <option>All</option>
                <option>General</option>
                {services.map((service) => (
                  <option key={service.slug} value={service.slug}>
                    {service.name}
                  </option>
                ))}
              </select>
              <button
                onClick={loadData}
                className="grid h-9 w-9 place-items-center rounded-lg border border-legacy-silver text-legacy-muted"
                title="Refresh"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            {loading && <p className="text-sm text-legacy-muted">Loading master documents...</p>}
            {!loading && filteredDocs.length === 0 && (
              <p className="text-sm text-legacy-muted">No master documents match these filters yet.</p>
            )}
            {filteredDocs.map((doc) => (
              <div key={doc.id} className="rounded-xl border border-legacy-silver p-4">
                {editingId === doc.id ? (
                  <div className="grid gap-3">
                    <input
                      value={editDraft.name}
                      onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })}
                      className="rounded-lg border border-legacy-silver px-3 py-2"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <select
                        value={editDraft.category}
                        onChange={(event) => setEditDraft({ ...editDraft, category: event.target.value })}
                        className="rounded-lg border border-legacy-silver px-3 py-2"
                      >
                        {MASTER_CATEGORIES.map((category) => (
                          <option key={category}>{category}</option>
                        ))}
                      </select>
                      <select
                        value={editDraft.service_slug}
                        onChange={(event) => setEditDraft({ ...editDraft, service_slug: event.target.value })}
                        className="rounded-lg border border-legacy-silver px-3 py-2"
                      >
                        <option value="">General (all clients)</option>
                        {services.map((service) => (
                          <option key={service.slug} value={service.slug}>
                            {service.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      value={editDraft.description}
                      onChange={(event) => setEditDraft({ ...editDraft, description: event.target.value })}
                      className="rounded-lg border border-legacy-silver px-3 py-2"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(doc)}
                        className="rounded-lg bg-legacy-purple px-4 py-2 text-sm font-black text-white"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-legacy-silver px-4 py-2 text-sm font-bold text-legacy-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-black text-legacy-ink">
                        {doc.name} <span className="font-normal text-legacy-muted">v{doc.version}</span>
                      </p>
                      <p className="text-sm text-legacy-muted">
                        {doc.category} • {serviceName(doc.service_slug)} • Updated{" "}
                        {new Date(doc.updated_at).toLocaleDateString()} •{" "}
                        <span className={doc.is_active ? "text-legacy-green" : "text-legacy-plum"}>
                          {doc.is_active ? "Active" : "Archived"}
                        </span>
                      </p>
                      {doc.description ? <p className="mt-1 text-sm text-legacy-muted">{doc.description}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {doc.storage_path ? (
                        <button
                          onClick={() => viewDocument(doc.storage_path)}
                          className="flex items-center gap-1 rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-ink"
                        >
                          <FileText size={14} /> View
                        </button>
                      ) : null}
                      <label className="cursor-pointer rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-ink">
                        Replace file
                        <input
                          type="file"
                          className="sr-only"
                          onChange={(event) => {
                            const file = event.target.files?.[0]
                            if (file) replaceFile(doc, file)
                            event.target.value = ""
                          }}
                        />
                      </label>
                      <button
                        onClick={() => startEdit(doc)}
                        className="rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-ink"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleActive(doc)}
                        className="rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-ink"
                      >
                        {doc.is_active ? "Archive" : "Activate"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
