"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  FolderUp,
  MessageSquare,
  Plus,
  Search,
  Send,
  Trash2,
  Upload,
  Users
} from "lucide-react";
import { PortalShell } from "@/components/portal-shell";
import { PageHeader, StatCard, StatusPill } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  appointments,
  clientProfile,
  clients,
  documents,
  invoices,
  messages,
  notifications,
  resources,
  serviceTrackers
} from "@/lib/demo-data";
import type { DocumentCategory, PortalDocument, UserRole, ServiceTracker } from "@/lib/types";

const categories: DocumentCategory[] = ["Tax", "Credit", "Bookkeeping", "Life Insurance", "General"];

export default function PortalPage() {
  const [role, setRole] = useState<UserRole>("client");
  const [active, setActive] = useState("dashboard");
  const [docList, setDocList] = useState<PortalDocument[]>(documents);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>("Tax");
  const [messageText, setMessageText] = useState("");

  const visibleMessages = useMemo(() => messages, []);

  const [realName, setRealName] = useState<string | null>(null);
  const [realServices, setRealServices] = useState<ServiceTracker[]>([]);

  useEffect(() => {
    const supabase = supabaseBrowser();
    if (!supabase) return;

    supabase.auth.getUser().then(async (result) => {
      const user = result.data.user;
      if (!user) return;

      const profileResult = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
      const profile = profileResult.data;
      if (!profile) return;

      setRealName(profile.full_name);
      setRole(profile.role as UserRole);
      setActive(profile.role === "admin" ? "admin" : "dashboard");

      const clientResult = await supabase.from("clients").select("id").eq("profile_id", user.id).single();
      const client = clientResult.data;
      if (!client) return;

      const csResult = await supabase
      .from("client_services")
      .select("id, current_stage, progress, admin_notes, next_step, last_updated, services(name, slug, stages)")
      .eq("client_id", client.id);
      const csRows: any = csResult.data;
      if (csRows) {
        const mapped = csRows.map((row: any) => ({
          key: row.services.slug,
          name: row.services.name,
          currentStage: row.current_stage,
          progress: row.progress,
          lastUpdated: row.last_updated,
          adminNotes: row.admin_notes || "",
          nextStep: row.next_step || "",
          stages: row.services.stages
        }));
        setRealServices(mapped);
      }
    });
  }, []);

  const displayName = realName || clientProfile.name;
  const displayServices = realServices.length > 0 ? realServices : serviceTrackers;

  return (
    <PortalShell role={role} active={active} onChange={setActive}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-legacy-muted">Signed in as</p>
          <p className="font-black text-legacy-ink">{role === "admin" ? "Business Owner" : displayName}</p>
        </div>
        <div className="flex rounded-xl border border-legacy-silver bg-white p-1">
          <button
            onClick={() => {
              setRole("client");
              setActive("dashboard");
            }}
            className={`rounded-lg px-4 py-2 text-sm font-black ${role === "client" ? "bg-legacy-purple text-white" : "text-legacy-muted"}`}
          >
            Client view
          </button>
          <button
            onClick={() => {
              setRole("admin");
              setActive("admin");
            }}
            className={`rounded-lg px-4 py-2 text-sm font-black ${role === "admin" ? "bg-legacy-purple text-white" : "text-legacy-muted"}`}
          >
            Admin view
          </button>
        </div>
      </div>

      {role === "client" ? (
        <>
          {active === "dashboard" && <Dashboard displayName={displayName} displayServices={displayServices} />}
          {active === "messages" && (
            <Messages messageText={messageText} setMessageText={setMessageText} visibleMessages={visibleMessages} />
          )}
          {active === "documents" && (
            <Documents
              docList={docList}
              setDocList={setDocList}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
            />
          )}
          {active === "status" && <ServiceStatus />}
          {active === "appointments" && <Appointments />}
          {active === "billing" && <Billing />}
          {active === "resources" && <Resources />}
          {active === "profile" && <Profile />}
        </>
      ) : (
        <>
          {active === "admin" && <AdminHome />}
          {active === "admin-leads" && <AdminLeads />}
          {active === "admin-clients" && <AdminClients />}
          {active === "admin-documents" && <AdminDocuments />}
          {active === "admin-messages" && <AdminMessages />}
          {active === "admin-billing" && <AdminBilling />}
        </>
      )}
    </PortalShell>
  );
}

function Dashboard({ displayName, displayServices }: { displayName: string; displayServices: ServiceTracker[] }) {
  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome, ${displayName.split(" ")[0]}`}
        description="Here is what is happening with your services, what we need from you, and what happens next."
        action={<button className="rounded-lg bg-legacy-purple px-5 py-3 font-black text-white">Upload document</button>}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Current services" value={String(displayServices.length)} note="Tax, credit, bookkeeping, and life insurance support." icon={ClipboardList} />
        <StatCard label="Next step" value="Upload" note="Childcare receipts are needed for your tax return." icon={FolderUp} />
        <StatCard label="Upcoming" value="Jul 12" note="Tax review call at 2:00 PM." icon={CalendarDays} />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="soft-panel p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-legacy-ink">Service overview</h2>
            <StatusPill>On track</StatusPill>
          </div>
          <div className="grid gap-4">
            {displayServices.map((service) => (
              <div key={service.key} className="rounded-2xl border border-legacy-silver p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-black text-legacy-ink">{service.name}</p>
                    <p className="text-sm text-legacy-muted">Current stage: {service.currentStage}</p>
                  </div>
                  <span className="text-sm font-black text-legacy-purple">{service.progress}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-legacy-silver/70">
                  <div className="h-full rounded-full bg-legacy-purple" style={{ width: `${service.progress}%` }} />
                </div>
                <p className="mt-3 text-sm leading-6 text-legacy-muted">Next: {service.nextStep}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-5">
          <div className="soft-panel p-5">
            <h2 className="text-xl font-black text-legacy-ink">Recent notifications</h2>
            <div className="mt-4 grid gap-3">
              {notifications.slice(0, 4).map((note) => (
                <div key={note.id} className="flex gap-3 rounded-xl bg-legacy-lavender/60 p-3">
                  <Bell size={18} className="mt-1 shrink-0 text-legacy-purple" />
                  <div>
                    <p className="font-bold text-legacy-ink">{note.title}</p>
                    <p className="text-sm leading-6 text-legacy-muted">{note.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="soft-panel p-5">
            <h2 className="text-xl font-black text-legacy-ink">Upcoming appointments</h2>
            <div className="mt-4 grid gap-3">
              {appointments.filter((appointment) => appointment.status === "Upcoming").map((appointment) => (
                <div key={appointment.id} className="rounded-xl border border-legacy-silver p-3">
                  <p className="font-bold text-legacy-ink">{appointment.title}</p>
                  <p className="text-sm text-legacy-muted">{appointment.date} at {appointment.time}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function Messages({
  visibleMessages,
  messageText,
  setMessageText
}: {
  visibleMessages: typeof messages;
  messageText: string;
  setMessageText: (value: string) => void;
}) {
  return (
    <>
      <PageHeader
        eyebrow="Messages"
        title="Message center"
        description="Ask questions, reply to requests, and keep financial conversations in one secure place."
      />
      <section className="grid gap-5 lg:grid-cols-[22rem_1fr]">
        <div className="soft-panel p-4">
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-legacy-silver px-3 py-2">
            <Search size={18} className="text-legacy-muted" />
            <input className="w-full border-0 bg-transparent outline-none" placeholder="Search messages" />
          </div>
          <div className="grid gap-2">
            {visibleMessages.map((message) => (
              <button key={message.id} className="rounded-xl border border-legacy-silver bg-white p-3 text-left hover:border-legacy-purple">
                <div className="flex justify-between gap-3">
                  <p className="font-black text-legacy-ink">{message.sender === "admin" ? "Lucille's Legacy" : "You"}</p>
                  {message.unread ? <span className="h-2.5 w-2.5 rounded-full bg-legacy-purple" /> : null}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-legacy-muted">{message.preview}</p>
                <p className="mt-2 text-xs font-bold text-legacy-muted">{message.timestamp}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="soft-panel flex min-h-[32rem] flex-col p-4">
          <div className="border-b border-legacy-silver pb-4">
            <p className="font-black text-legacy-ink">Lucille&apos;s Legacy</p>
            <p className="text-sm text-legacy-muted">Usually replies within one business day.</p>
          </div>
          <div className="flex-1 space-y-4 overflow-auto py-5">
            {visibleMessages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[82%] rounded-2xl p-4 ${
                  message.sender === "client"
                    ? "ml-auto bg-legacy-purple text-white"
                    : "bg-legacy-lavender text-legacy-ink"
                }`}
              >
                <p className="leading-7">{message.body}</p>
                <p className={`mt-2 text-xs font-bold ${message.sender === "client" ? "text-white/70" : "text-legacy-muted"}`}>
                  {message.timestamp}
                </p>
              </div>
            ))}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setMessageText("");
            }}
            className="flex flex-col gap-3 border-t border-legacy-silver pt-4 sm:flex-row"
          >
            <button type="button" className="rounded-lg border border-legacy-silver px-4 py-3 font-bold text-legacy-plum">
              Attach
            </button>
            <input
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-legacy-silver px-4 py-3"
              placeholder="Write a message..."
              required
            />
            <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-legacy-purple px-5 py-3 font-black text-white">
              <Send size={18} /> Send
            </button>
          </form>
        </div>
      </section>
    </>
  );
}

function Documents({
  docList,
  setDocList,
  selectedCategory,
  setSelectedCategory
}: {
  docList: PortalDocument[];
  setDocList: (docs: PortalDocument[]) => void;
  selectedCategory: DocumentCategory;
  setSelectedCategory: (category: DocumentCategory) => void;
}) {
  function addDemoDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file") as File | null;

    if (!file?.name) return;

    setDocList([
      {
        id: crypto.randomUUID(),
        name: file.name,
        uploadedAt: "Today",
        category: selectedCategory,
        status: "Received"
      },
      ...docList
    ]);
    form.reset();
  }

  return (
    <>
      <PageHeader
        eyebrow="Documents"
        title="Upload documents"
        description="Choose a category before uploading so your files go to the right service folder."
      />
      <section className="grid gap-5 lg:grid-cols-[24rem_1fr]">
        <form onSubmit={addDemoDocument} className="soft-panel grid content-start gap-4 p-5">
          <h2 className="text-xl font-black text-legacy-ink">New upload</h2>
          <label className="grid gap-2 font-bold text-legacy-ink">
            Category
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value as DocumentCategory)}
              className="rounded-lg border border-legacy-silver px-3 py-3"
            >
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-3 rounded-2xl border border-dashed border-legacy-purple bg-legacy-lavender/60 p-5 text-center font-bold text-legacy-plum">
            <Upload className="mx-auto" size={28} />
            Select a file
            <input name="file" type="file" className="sr-only" required />
          </label>
          <button className="rounded-lg bg-legacy-purple px-5 py-3 font-black text-white">Upload document</button>
          <p className="text-sm leading-6 text-legacy-muted">
            When Supabase is connected, files will upload to private Storage buckets organized by client and category.
          </p>
        </form>

        <div className="soft-panel p-5">
          <h2 className="text-xl font-black text-legacy-ink">Your documents</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left">
              <thead className="text-sm text-legacy-muted">
                <tr>
                  <th className="py-3">Document</th>
                  <th>Category</th>
                  <th>Uploaded</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-legacy-silver">
                {docList.map((document) => (
                  <tr key={document.id}>
                    <td className="py-4 font-bold text-legacy-ink">{document.name}</td>
                    <td>{document.category}</td>
                    <td>{document.uploadedAt}</td>
                    <td>
                      <StatusPill tone={document.status === "Needs update" ? "amber" : "green"}>{document.status}</StatusPill>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => setDocList(docList.filter((item) => item.id !== document.id))}
                        className="inline-flex items-center gap-2 rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-muted"
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}

function ServiceStatus() {
  return (
    <>
      <PageHeader
        eyebrow="Service Status"
        title="Your progress"
        description="Only services assigned to you appear here. Each tracker explains where things stand and what happens next."
      />
      <div className="grid gap-5">
        {serviceTrackers.map((service) => (
          <article key={service.key} className="soft-panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-legacy-ink">{service.name}</h2>
                <p className="mt-1 text-legacy-muted">Last updated: {service.lastUpdated}</p>
              </div>
              <StatusPill>{service.currentStage}</StatusPill>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-legacy-silver">
              <div className="h-full rounded-full bg-legacy-purple" style={{ width: `${service.progress}%` }} />
            </div>
            <div className="mt-5 grid gap-2 md:grid-cols-2 lg:grid-cols-4">
              {service.stages.map((stage) => {
                const reached = service.stages.indexOf(stage) <= service.stages.indexOf(service.currentStage);
                return (
                  <div key={stage} className={`rounded-xl border p-3 ${reached ? "border-legacy-purple bg-legacy-lavender" : "border-legacy-silver bg-white"}`}>
                    <CheckCircle2 size={18} className={reached ? "text-legacy-purple" : "text-legacy-muted"} />
                    <p className="mt-2 text-sm font-bold text-legacy-ink">{stage}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-[#fbfafe] p-4">
                <p className="font-black text-legacy-ink">Notes from admin</p>
                <p className="mt-2 leading-7 text-legacy-muted">{service.adminNotes}</p>
              </div>
              <div className="rounded-xl bg-legacy-lavender p-4">
                <p className="font-black text-legacy-ink">Next step</p>
                <p className="mt-2 leading-7 text-legacy-muted">{service.nextStep}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function Appointments() {
  return (
    <>
      <PageHeader
        eyebrow="Appointments"
        title="Appointments"
        description="See upcoming and past appointments. This area is ready for Calendly or Google Calendar later."
        action={<button className="rounded-lg bg-legacy-purple px-5 py-3 font-black text-white">Schedule</button>}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        {["Upcoming", "Past"].map((status) => (
          <section key={status} className="soft-panel p-5">
            <h2 className="text-xl font-black text-legacy-ink">{status} appointments</h2>
            <div className="mt-4 grid gap-3">
              {appointments.filter((appointment) => appointment.status === status).map((appointment) => (
                <div key={appointment.id} className="rounded-xl border border-legacy-silver p-4">
                  <p className="font-black text-legacy-ink">{appointment.title}</p>
                  <p className="mt-1 text-legacy-muted">{appointment.date} at {appointment.time}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-plum">Reschedule</button>
                    <button className="rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-muted">Cancel</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function Billing() {
  return (
    <>
      <PageHeader
        eyebrow="Billing"
        title="Billing"
        description="Review balances, invoices, payment history, and upcoming payments. Payment links can be connected later."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Current balance" value="$425" note="One open invoice is due July 15." icon={Banknote} />
        <StatCard label="Paid invoices" value="1" note="Your last payment was received." icon={CheckCircle2} />
        <StatCard label="Upcoming payment" value="Jul 20" note="Bookkeeping invoice is scheduled." icon={CalendarDays} />
      </div>
      <section className="soft-panel mt-5 p-5">
        <h2 className="text-xl font-black text-legacy-ink">Invoices</h2>
        <div className="mt-4 grid gap-3">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="flex flex-col justify-between gap-3 rounded-xl border border-legacy-silver p-4 sm:flex-row sm:items-center">
              <div>
                <p className="font-black text-legacy-ink">{invoice.label}</p>
                <p className="text-sm text-legacy-muted">Due: {invoice.dueDate}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-black text-legacy-ink">{invoice.amount}</p>
                <StatusPill tone={invoice.status === "Paid" ? "green" : invoice.status === "Scheduled" ? "gray" : "amber"}>{invoice.status}</StatusPill>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function Resources() {
  return (
    <>
      <PageHeader
        eyebrow="Resources"
        title="Helpful resources"
        description="Download simple guides and worksheets for taxes, credit, bookkeeping, planning, and insurance."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {resources.map((resource) => (
          <article key={resource.id} className="soft-panel p-5">
            <FileText size={26} className="text-legacy-purple" />
            <h2 className="mt-4 text-xl font-black text-legacy-ink">{resource.title}</h2>
            <p className="mt-2 min-h-16 leading-7 text-legacy-muted">{resource.description}</p>
            <button className="mt-4 rounded-lg border border-legacy-silver px-4 py-3 font-black text-legacy-plum">Download</button>
          </article>
        ))}
      </div>
    </>
  );
}

function Profile() {
  return (
    <>
      <PageHeader
        eyebrow="Profile"
        title="Your profile"
        description="Keep your contact details updated so Lucille's Legacy can reach you the way you prefer."
      />
      <form className="soft-panel grid gap-4 p-5 md:grid-cols-2">
        {[
          ["Name", clientProfile.name],
          ["Phone", clientProfile.phone],
          ["Email", clientProfile.email],
          ["Address", clientProfile.address],
          ["Emergency Contact", clientProfile.emergencyContact]
        ].map(([label, value]) => (
          <label key={label} className="grid gap-2 font-bold text-legacy-ink">
            {label}
            <input className="rounded-lg border border-legacy-silver px-3 py-3 font-normal" defaultValue={value} />
          </label>
        ))}
        <label className="grid gap-2 font-bold text-legacy-ink">
          Preferred Communication Method
          <select className="rounded-lg border border-legacy-silver px-3 py-3 font-normal" defaultValue={clientProfile.preferredContact}>
            <option>Email</option>
            <option>Phone</option>
            <option>Text</option>
          </select>
        </label>
        <div className="md:col-span-2">
          <button className="rounded-lg bg-legacy-purple px-5 py-3 font-black text-white">Save profile</button>
        </div>
      </form>
    </>
  );
}

function AdminHome() {
  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Business owner dashboard"
        description="View clients, update service status, check documents, send messages, and manage placeholder billing."
        action={<button className="inline-flex items-center gap-2 rounded-lg bg-legacy-purple px-5 py-3 font-black text-white"><Plus size={18} /> Add client</button>}
      />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Clients" value={String(clients.length)} note="Active portal clients." icon={Users} />
        <StatCard label="Documents" value={String(documents.length)} note="Files waiting in review." icon={FolderUp} />
        <StatCard label="Unread" value="3" note="Messages needing response." icon={MessageSquare} />
        <StatCard label="Open billing" value="$425" note="One invoice currently due." icon={Banknote} />
      </div>
      <section className="soft-panel mt-5 p-5">
        <h2 className="text-xl font-black text-legacy-ink">Clients needing attention</h2>
        <div className="mt-4 grid gap-3">
          {clients.map((client, index) => (
            <div key={client.id} className="flex flex-col justify-between gap-3 rounded-xl border border-legacy-silver p-4 sm:flex-row sm:items-center">
              <div>
                <p className="font-black text-legacy-ink">{client.name}</p>
                <p className="text-sm text-legacy-muted">{client.email} • {client.preferredContact}</p>
              </div>
              <StatusPill tone={index === 0 ? "amber" : "purple"}>{index === 0 ? "Needs document" : "On track"}</StatusPill>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function AdminLeads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadLeads() {
    const supabase = supabaseBrowser();
    if (!supabase) { setLoading(false); return; }
    const result = await supabase.from("leads").select("*").order("submitted_at", { ascending: false });
    if (result.error) setError(result.error.message);
    setLeads(result.data || []);
    setLoading(false);
  }

  useEffect(() => { loadLeads(); }, []);

  async function approve(leadId: string) {
    setBusyId(leadId);
    setError("");
    const res = await fetch("/api/leads/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId })
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Something went wrong approving this lead.");
    } else {
      await loadLeads();
    }
    setBusyId(null);
  }

  return (
    <>
    <PageHeader eyebrow="Admin" title="Leads" description="New intake form submissions. Approve a lead to create their client account and portal access." />
      {error ? <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}
    <section className="soft-panel p-5">
      {loading ? (
      <p className="text-legacy-muted">Loading leads...</p>
      ) : leads.length === 0 ? (
      <p className="text-legacy-muted">No leads yet.</p>
      ) : (
      <div className="grid gap-3">
        {leads.map((lead) => (
        <div key={lead.id} className="flex flex-col justify-between gap-3 rounded-xl border border-legacy-silver p-4 sm:flex-row sm:items-start">
        <div>
        <p className="font-black text-legacy-ink">{lead.full_name}</p>
        <p className="text-sm text-legacy-muted">{lead.email} • {lead.phone} • {lead.city}, {lead.state}</p>
        <p className="mt-2 text-xs text-legacy-muted">Services: {Array.isArray(lead.services_needed) ? lead.services_needed.join(", ") : "-"} • Submitted {new Date(lead.submitted_at).toLocaleString()}</p>
          </div>
        <div className="flex items-center gap-3">
        <StatusPill tone={lead.status === "Approved" ? "green" : "amber"}>{lead.status}</StatusPill>
        {lead.status !== "Approved" ? (
        <button onClick={() => approve(lead.id)} disabled={busyId === lead.id} className="rounded-lg bg-legacy-purple px-4 py-2 text-sm font-black text-white disabled:opacity-50">
          {busyId === lead.id ? "Approving..." : "Approve"}</button>
        ) : null}
        </div>
      </div>
      ))}
      </div>
      )}
      </section>
    </>
    );
}

function AdminClients() {
  return (
    <>
      <PageHeader eyebrow="Admin" title="Client management" description="Add clients, assign services, and update tracker notes." />
      <div className="grid gap-5 xl:grid-cols-[1fr_24rem]">
        <section className="soft-panel p-5">
          <h2 className="text-xl font-black text-legacy-ink">All clients</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left">
              <thead className="text-sm text-legacy-muted">
                <tr>
                  <th className="py-3">Client</th>
                  <th>Assigned services</th>
                  <th>Status</th>
                  <th>Next step</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-legacy-silver">
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td className="py-4">
                      <p className="font-black text-legacy-ink">{client.name}</p>
                      <p className="text-sm text-legacy-muted">{client.email}</p>
                    </td>
                    <td>Tax, Credit</td>
                    <td><StatusPill>Active</StatusPill></td>
                    <td className="text-legacy-muted">Confirm next document request.</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <form className="soft-panel grid content-start gap-4 p-5">
          <h2 className="text-xl font-black text-legacy-ink">Add new client</h2>
          <input className="rounded-lg border border-legacy-silver px-3 py-3" placeholder="Client name" />
          <input className="rounded-lg border border-legacy-silver px-3 py-3" placeholder="Email address" />
          <select className="rounded-lg border border-legacy-silver px-3 py-3">
            <option>Assign tax service</option>
            <option>Assign credit service</option>
            <option>Assign bookkeeping service</option>
            <option>Assign life insurance service</option>
          </select>
          <textarea className="rounded-lg border border-legacy-silver px-3 py-3" rows={4} placeholder="Service notes" />
          <button className="rounded-lg bg-legacy-purple px-5 py-3 font-black text-white">Save client</button>
        </form>
      </div>
    </>
  );
}

function AdminDocuments() {
  return (
    <>
      <PageHeader eyebrow="Admin" title="Uploaded documents" description="Review client uploads by service category and status." />
      <section className="soft-panel p-5">
        <div className="grid gap-3">
          {documents.map((document) => (
            <div key={document.id} className="flex flex-col justify-between gap-3 rounded-xl border border-legacy-silver p-4 sm:flex-row sm:items-center">
              <div>
                <p className="font-black text-legacy-ink">{document.name}</p>
                <p className="text-sm text-legacy-muted">{document.category} • Uploaded {document.uploadedAt}</p>
              </div>
              <div className="flex gap-2">
                <StatusPill>{document.status}</StatusPill>
                <button className="rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-plum">View</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function AdminMessages() {
  return (
    <>
      <PageHeader eyebrow="Admin" title="Send messages" description="Send updates, document requests, and service notes to clients." />
      <section className="soft-panel grid gap-4 p-5">
        <select className="rounded-lg border border-legacy-silver px-3 py-3">
          {clients.map((client) => <option key={client.id}>{client.name}</option>)}
        </select>
        <textarea className="rounded-lg border border-legacy-silver px-3 py-3" rows={6} placeholder="Write a clear message..." />
        <button className="inline-flex w-fit items-center gap-2 rounded-lg bg-legacy-purple px-5 py-3 font-black text-white">
          <Send size={18} /> Send message
        </button>
      </section>
    </>
  );
}

function AdminBilling() {
  return (
    <>
      <PageHeader eyebrow="Admin" title="Billing placeholders" description="Update invoice status now and connect Stripe or payment links later." />
      <section className="soft-panel p-5">
        <div className="grid gap-3">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="grid gap-3 rounded-xl border border-legacy-silver p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
              <div>
                <p className="font-black text-legacy-ink">{invoice.label}</p>
                <p className="text-sm text-legacy-muted">{invoice.dueDate}</p>
              </div>
              <p className="font-black text-legacy-ink">{invoice.amount}</p>
              <select className="rounded-lg border border-legacy-silver px-3 py-2" defaultValue={invoice.status}>
                <option>Due</option>
                <option>Paid</option>
                <option>Scheduled</option>
              </select>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
