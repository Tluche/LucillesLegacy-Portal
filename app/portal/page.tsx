"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
Banknote,
Bell,
CalendarDays,
CheckCircle2,
ClipboardList,
Download,
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
messages,
notifications,
serviceTrackers
} from "@/lib/demo-data";
import type { DocumentCategory, UserRole, ServiceTracker } from "@/lib/types";
import { ClientBilling } from "@/components/billing-client";
import { AdminBillingPanel } from "@/components/billing-admin";
import { AdminMasterDocuments } from "@/components/admin-master-documents";

const categories: DocumentCategory[] = ["Tax", "Credit", "Bookkeeping", "Life Insurance", "General"];

export default function PortalPage() {
const [role, setRole] = useState<UserRole>("client");
const [active, setActive] = useState("dashboard");
const [messageText, setMessageText] = useState("");

const visibleMessages = useMemo(() => messages, []);

const [realName, setRealName] = useState<string | null>(null);
const [realServices, setRealServices] = useState<ServiceTracker[]>([]);
const [realClientId, setRealClientId] = useState<string | null>(null);
const [realNotifications, setRealNotifications] = useState<{ id: string; title: string; text: string }[]>([]);
const [realAppointments, setRealAppointments] = useState<{ id: string; title: string; date: string; time: string; status: string }[]>([]);

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

setRealClientId(client.id);

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

const notifResult = await supabase
.from("notifications")
.select("id, title, body, created_at")
.eq("client_id", client.id)
.order("created_at", { ascending: false })
.limit(4);
const notifRows: any = notifResult.data;
if (notifRows) {
setRealNotifications(notifRows.map((row: any) => ({ id: row.id, title: row.title, text: row.body })));
}

const apptResult = await supabase
.from("appointments")
.select("id, title, starts_at, status")
.eq("client_id", client.id)
.order("starts_at", { ascending: true });
const apptRows: any = apptResult.data;
if (apptRows) {
setRealAppointments(
apptRows.map((row: any) => ({
id: row.id,
title: row.title,
date: new Date(row.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
time: new Date(row.starts_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
status: row.status
}))
);
}
});
}, []);

const displayName = realName || clientProfile.name;
const displayServices = realServices.length > 0 ? realServices : serviceTrackers;
const displayNotifications = realClientId ? realNotifications : notifications;
const displayAppointments = realClientId ? realAppointments : appointments;

return (
<PortalShell role={role} active={active} onChange={setActive}>
<div className="mb-5 flex flex-wrap items-center justify-between gap-3">
<div>
<p className="text-sm font-bold text-legacy-muted">Signed in as</p>
<p className="font-black text-legacy-ink">{role === "admin" ? "Tia" : displayName}</p>
</div>
</div>

{role === "client" ? (
<>
{active === "dashboard" && <Dashboard displayName={displayName} displayServices={displayServices} displayNotifications={displayNotifications} displayAppointments={displayAppointments} onUploadClick={() => setActive("documents")} />}
{active === "messages" && (
<Messages messageText={messageText} setMessageText={setMessageText} visibleMessages={visibleMessages} />
)}
{active === "documents" && <Documents clientId={realClientId} />}
  {active === "status" && <ServiceStatus clientId={realClientId} />}
{active === "appointments" && <Appointments />}
{active === "billing" && <ClientBilling clientId={realClientId} />}
{active === "resources" && <Resources />}
{active === "profile" && <Profile />}
</>
) : (
<>
{active === "admin" && <AdminHome />}
{active === "admin-leads" && <AdminLeads />}
{active === "admin-clients" && <AdminClients />}
{active === "admin-master-docs" && <AdminMasterDocuments />}
{active === "admin-documents" && <AdminDocuments />}
{active === "admin-resources" && <AdminResources />}
{active === "admin-messages" && <AdminMessages />}
{active === "admin-billing" && <AdminBillingPanel />}
</>
)}
</PortalShell>
);
}

function Dashboard({
displayName,
displayServices,
displayNotifications,
displayAppointments,
onUploadClick
}: {
displayName: string;
displayServices: ServiceTracker[];
displayNotifications: { id: string; title: string; text: string }[];
displayAppointments: { id: string; title: string; date: string; time: string; status: string }[];
onUploadClick: () => void;
}) {
const upcomingAppointment = displayAppointments.find((appointment) => appointment.status === "Upcoming");
const nextStepService = displayServices.find((service) => service.nextStep);

return (
<>
<PageHeader
eyebrow="Dashboard"
title={`Welcome, ${displayName.split(" ")[0]}`}
description="Here is what is happening with your services, what we need from you, and what happens next."
action={<button onClick={onUploadClick} className="rounded-lg bg-legacy-purple px-5 py-3 font-black text-white">Upload document</button>}
/>
<div className="grid gap-4 md:grid-cols-3">
<StatCard label="Current services" value={String(displayServices.length)} note="Tax, credit, bookkeeping, and life insurance support." icon={ClipboardList} />
<StatCard
label="Next step"
value={nextStepService ? "Action needed" : "All set"}
note={nextStepService ? nextStepService.nextStep : "You are all caught up for now."}
icon={FolderUp}
/>
<StatCard
label="Upcoming"
value={upcomingAppointment ? upcomingAppointment.date : "None"}
note={upcomingAppointment ? `${upcomingAppointment.title} at ${upcomingAppointment.time}` : "No appointments scheduled yet."}
icon={CalendarDays}
/>
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
{displayNotifications.length === 0 && (
<p className="text-sm text-legacy-muted">No notifications yet.</p>
)}
{displayNotifications.slice(0, 4).map((note) => (
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
{displayAppointments.filter((appointment) => appointment.status === "Upcoming").length === 0 && (
<p className="text-sm text-legacy-muted">No upcoming appointments scheduled.</p>
)}
{displayAppointments.filter((appointment) => appointment.status === "Upcoming").map((appointment) => (
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

const VAULT_FOLDERS = [
  "Agreements",
  "Welcome Packet",
  "Service Guides",
  "Checklists",
  "Uploaded by Client",
  "Uploaded by Tia",
  "Completed Work",
  "Billing",
  "Resources"
];

function Documents({ clientId }: { clientId: string | null }) {
const [docList, setDocList] = useState<any[]>([]);
const [loading, setLoading] = useState(true);
const [uploading, setUploading] = useState(false);
const [error, setError] = useState("");
const [selectedFile, setSelectedFile] = useState<File | null>(null);

async function loadDocuments() {
const supabase = supabaseBrowser();
if (!supabase || !clientId) {
setLoading(false);
return;
}
const result = await supabase
.from("documents")
.select("id, name, storage_path, category, status, folder, created_at")
.eq("client_id", clientId)
.order("created_at", { ascending: false });
if (!result.error) {
setDocList(result.data || []);
}
setLoading(false);
}

useEffect(() => {
loadDocuments();
}, [clientId]);

async function addDocument(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();
setError("");
const form = event.currentTarget;
const formData = new FormData(form);
const file = formData.get("file") as File | null;

if (!file?.name) {
setError("Please choose a file before uploading.");
return;
}
if (!clientId) return;

const supabase = supabaseBrowser();
if (!supabase) {
setError("Document upload is currently unavailable.");
return;
}

setUploading(true);
const userResult = await supabase.auth.getUser();
const userId = userResult.data.user?.id;
const path = `${clientId}/Uploaded by Client/${Date.now()}-${file.name}`;

const uploadResult = await supabase.storage.from("CLIENT DOCUMENTS").upload(path, file);
if (uploadResult.error) {
setError(uploadResult.error.message);
setUploading(false);
return;
}

const insertResult = await supabase.from("documents").insert({
client_id: clientId,
uploaded_by: userId,
name: file.name,
storage_path: path,
category: "General",
folder: "Uploaded by Client",
visible_to_client: true,
status: "Received"
});

setUploading(false);
if (insertResult.error) {
setError(insertResult.error.message);
return;
}

form.reset();
setSelectedFile(null);
await loadDocuments();
}

async function viewDocument(storagePath: string) {
const supabase = supabaseBrowser();
if (!supabase) return;
const result = await supabase.storage.from("CLIENT DOCUMENTS").createSignedUrl(storagePath, 60);
if (result.data?.signedUrl) {
window.open(result.data.signedUrl, "_blank");
}
}

async function deleteDocument(id: string, storagePath: string) {
const supabase = supabaseBrowser();
if (!supabase) return;
await supabase.storage.from("CLIENT DOCUMENTS").remove([storagePath]);
await supabase.from("documents").delete().eq("id", id);
await loadDocuments();
}

return (
<>
<PageHeader
eyebrow="Documents"
title="Document vault"
description="View documents shared with you and upload anything Tia has requested. Your files are only visible to you and Tia."
/>
<section className="grid gap-5 lg:grid-cols-[24rem_1fr]">
<form onSubmit={addDocument} className="soft-panel grid content-start gap-4 p-5">
<h2 className="text-xl font-black text-legacy-ink">Upload a document</h2>
<label className="grid gap-3 rounded-2xl border border-dashed border-legacy-purple bg-legacy-lavender/60 p-5 text-center font-bold text-legacy-plum">
<Upload className="mx-auto" size={28} />
{selectedFile ? selectedFile.name : "Select a file"}
<input
name="file"
type="file"
className="sr-only"
required
onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
/>
</label>
<button disabled={uploading} className="rounded-lg bg-legacy-purple px-5 py-3 font-black text-white disabled:opacity-50">
{uploading ? "Uploading..." : "Upload document"}
</button>
{error ? <p className="rounded-lg bg-legacy-lavender p-3 text-sm text-legacy-plum">{error}</p> : null}
</form>

<div className="grid gap-5">
{loading && <p className="text-sm text-legacy-muted">Loading your document vault...</p>}
{!loading &&
VAULT_FOLDERS.map((folder) => {
const folderDocs = docList.filter((document) => (document.folder || "Uploaded by Client") === folder);
return (
<div key={folder} className="soft-panel p-5">
<h2 className="text-lg font-black text-legacy-ink">{folder}</h2>
<div className="mt-3 grid gap-3">
{folderDocs.length === 0 && <p className="text-sm text-legacy-muted">No documents yet.</p>}
{folderDocs.map((document) => (
<div
key={document.id}
className="flex flex-col justify-between gap-2 rounded-xl border border-legacy-silver p-4 sm:flex-row sm:items-center"
>
<div>
<p className="font-black text-legacy-ink">{document.name}</p>
<p className="text-sm text-legacy-muted">
Added {new Date(document.created_at).toLocaleDateString()} •{" "}
<StatusPill tone={document.status === "Needs update" ? "amber" : "green"}>{document.status}</StatusPill>
</p>
</div>
<div className="flex gap-2">
<button
onClick={() => viewDocument(document.storage_path)}
className="rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-ink"
>
View
</button>
{folder === "Uploaded by Client" ? (
<button
onClick={() => deleteDocument(document.id, document.storage_path)}
className="rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-plum"
>
Remove
</button>
) : null}
</div>
</div>
))}
</div>
</div>
);
})}
</div>
</section>
</>
);
}

function ServiceStatus({ clientId }: { clientId: string | null }) {
  const [enrolled, setEnrolled] = useState<any[]>([]);
  const [available, setAvailable] = useState<any[]>([]);
  const [requestedIds, setRequestedIds] = useState<string[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [requestError, setRequestError] = useState("");

  async function loadServices() {
    const supabase = supabaseBrowser();
    if (!supabase || !clientId) {
      setLoadingServices(false);
      return;
    }

    const [enrolledResult, allServicesResult, requestsResult] = await Promise.all([
      supabase
      .from("client_services")
      .select("id, current_stage, progress, admin_notes, next_step, last_updated, services(id, slug, name, stages)")
      .eq("client_id", clientId),
      supabase.from("services").select("id, slug, name, stages"),
      supabase.from("service_requests").select("service_id, status").eq("client_id", clientId)
      ]);

    const enrolledRows: any[] = enrolledResult.data || [];
    const allServiceRows: any[] = allServicesResult.data || [];
    const requestRows: any[] = requestsResult.data || [];

    setEnrolled(enrolledRows);
    setRequestedIds(requestRows.filter((row: any) => row.status === "pending").map((row: any) => row.service_id));

    const enrolledServiceIds = enrolledRows.map((row: any) => row.services?.id);
    setAvailable(allServiceRows.filter((service: any) => !enrolledServiceIds.includes(service.id)));

    setLoadingServices(false);
  }

  useEffect(() => {
    loadServices();
  }, [clientId]);

  async function requestService(serviceId: string) {
    const supabase = supabaseBrowser();
    if (!supabase || !clientId) return;

    setRequesting(serviceId);
    setRequestError("");

    const insertResult = await supabase.from("service_requests").insert({
      client_id: clientId,
      service_id: serviceId,
      status: "pending"
    });

    setRequesting(null);
    if (insertResult.error) {
      setRequestError(insertResult.error.message);
      return;
    }

    await loadServices();
  }

  return (
    <>
    <PageHeader
      eyebrow="Service Status"
      title="Your progress"
      description="Only services assigned to you appear here. Each tracker explains where things stand and what happens next."
      />
      {loadingServices && <p className="mt-4 text-sm text-legacy-muted">Loading your services...</p>}
      {!loadingServices && enrolled.length === 0 && (
      <p className="mt-4 text-sm text-legacy-muted">You're not enrolled in any services yet. Explore what's available below.</p>
    )}
    <div className="grid gap-5">
      {enrolled.map((row) => {
      const service = row.services;
      const stages: string[] = service?.stages || [];
      const currentIndex = stages.indexOf(row.current_stage);
      return (
        <article key={row.id} className="soft-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
        <h2 className="text-2xl font-black text-legacy-ink">{service?.name}</h2>
        <p className="mt-1 text-legacy-muted">Last updated: {row.last_updated ? new Date(row.last_updated).toLocaleDateString() : "—"}</p>
        </div>
        <StatusPill>{row.current_stage}</StatusPill>
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-legacy-silver">
        <div className="h-full rounded-full bg-legacy-purple" style={{ width: `${row.progress || 0}%` }} />
        </div>
        <div className="mt-5 grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          {stages.map((stage) => {
          const reached = stages.indexOf(stage) <= currentIndex;
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
        <p className="mt-2 leading-7 text-legacy-muted">{row.admin_notes || "No notes yet."}</p>
        </div>
        <div className="rounded-xl bg-legacy-lavender p-4">
        <p className="font-black text-legacy-ink">Next step</p>
        <p className="mt-2 leading-7 text-legacy-muted">{row.next_step || "We'll update this soon."}</p>
        </div>
        </div>
        </article>
        );
    })}
    </div>
    <section className="soft-panel mt-5 p-5">
    <h2 className="text-xl font-black text-legacy-ink">Explore additional services</h2>
    <p className="mt-1 text-sm text-legacy-muted">Interested in more support? Request a service below and we'll follow up with you.</p>
      {requestError && <p className="mt-3 text-sm text-red-600">{requestError}</p>}
    <div className="mt-4 grid gap-3">
      {!loadingServices && available.length === 0 && (
      <p className="text-sm text-legacy-muted">You're already enrolled in everything we currently offer.</p>
    )}
      {available.map((service) => {
      const alreadyRequested = requestedIds.includes(service.id);
      return (
        <div key={service.id} className="flex flex-col justify-between gap-3 rounded-xl border border-legacy-silver p-4 sm:flex-row sm:items-center">
        <div>
        <p className="font-black text-legacy-ink">{service.name}</p>
        <p className="text-sm text-legacy-muted">Starts with: {service.stages?.[0]}</p>
        </div>
          {alreadyRequested ? (
          <StatusPill tone="purple">Requested — we'll be in touch</StatusPill>
          ) : (
          <button
            onClick={() => requestService(service.id)}
            disabled={requesting === service.id}
            className="rounded-lg bg-legacy-purple px-5 py-3 font-black text-white disabled:opacity-50"
            >
            {requesting === service.id ? "Requesting..." : "Request this service"}
          </button>
        )}
        </div>
        );
    })}
    </div>
    </section>
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

function Billing({ clientId }: { clientId: string | null }) {
const [invoiceRows, setInvoiceRows] = useState<any[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
const supabase = supabaseBrowser();
if (!supabase || !clientId) {
setLoading(false);
return;
}
(async () => {
const result = await supabase
.from("invoices")
.select("id, label, amount_cents, due_date, status, created_at")
.eq("client_id", clientId)
.order("due_date", { ascending: true });
if (!result.error) setInvoiceRows(result.data || []);
setLoading(false);
})();
}, [clientId]);

const dueInvoices = invoiceRows.filter((invoice) => invoice.status === "Due");
const paidInvoices = invoiceRows.filter((invoice) => invoice.status === "Paid");
const scheduledInvoices = invoiceRows.filter((invoice) => invoice.status === "Scheduled");
const balanceCents = dueInvoices.reduce((sum, invoice) => sum + (invoice.amount_cents || 0), 0);
const nextScheduled = scheduledInvoices[0];

function formatCents(cents: number) {
return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

return (
<>
<PageHeader
eyebrow="Billing"
title="Billing"
description="Review balances, invoices, payment history, and upcoming payments."
/>
<div className="grid gap-4 md:grid-cols-3">
<StatCard
label="Current balance"
value={formatCents(balanceCents)}
note={dueInvoices.length > 0 ? `${dueInvoices.length} open invoice${dueInvoices.length > 1 ? "s" : ""}.` : "No open invoices."}
icon={Banknote}
/>
<StatCard label="Paid invoices" value={String(paidInvoices.length)} note="Total invoices marked paid." icon={CheckCircle2} />
<StatCard
label="Upcoming payment"
value={nextScheduled ? new Date(nextScheduled.due_date).toLocaleDateString() : "None"}
note={nextScheduled ? nextScheduled.label : "No scheduled payments."}
icon={CalendarDays}
/>
</div>
<section className="soft-panel mt-5 p-5">
<h2 className="text-xl font-black text-legacy-ink">Invoices</h2>
<div className="mt-4 grid gap-3">
{loading && <p className="text-sm text-legacy-muted">Loading invoices...</p>}
{!loading && invoiceRows.length === 0 && (
<p className="text-sm text-legacy-muted">No invoices yet.</p>
)}
{invoiceRows.map((invoice) => (
<div key={invoice.id} className="flex flex-col justify-between gap-3 rounded-xl border border-legacy-silver p-4 sm:flex-row sm:items-center">
<div>
<p className="font-black text-legacy-ink">{invoice.label}</p>
<p className="text-sm text-legacy-muted">Due: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "-"}</p>
</div>
<div className="flex items-center gap-3">
<p className="font-black text-legacy-ink">{formatCents(invoice.amount_cents || 0)}</p>
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
const [resourceList, setResourceList] = useState<any[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
const supabase = supabaseBrowser();
if (!supabase) {
setLoading(false);
return;
}
(async () => {
const result = await supabase
.from("resources")
.select("id, title, description, storage_path, category")
.eq("is_active", true)
.order("display_order", { ascending: true });
if (!result.error) setResourceList(result.data || []);
setLoading(false);
})();
}, []);

function openResource(storagePath: string) {
const supabase = supabaseBrowser();
if (!supabase || !storagePath) return;
const result = supabase.storage.from("resources").getPublicUrl(storagePath);
if (result.data?.publicUrl) {
window.open(result.data.publicUrl, "_blank");
}
}

return (
<>
<PageHeader
eyebrow="Resources"
title="Helpful resources"
description="Open or download guides and worksheets for taxes, credit, bookkeeping, planning, and insurance."
/>
<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
{loading && <p className="text-sm text-legacy-muted">Loading resources...</p>}
{!loading && resourceList.length === 0 && (
<p className="text-sm text-legacy-muted">No resources are available yet.</p>
)}
{resourceList.map((resource) => (
<article key={resource.id} className="soft-panel p-5">
<FileText size={26} className="text-legacy-purple" />
<h2 className="mt-4 text-xl font-black text-legacy-ink">{resource.title}</h2>
<p className="mt-2 min-h-16 leading-7 text-legacy-muted">{resource.description}</p>
<button
onClick={() => openResource(resource.storage_path)}
className="mt-4 inline-flex items-center gap-2 rounded-lg border border-legacy-silver px-4 py-3 font-black text-legacy-plum"
>
<Download size={18} /> Open / Download
</button>
</article>
))}
</div>
</>
);
}

function Profile() {
const [newPassword, setNewPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
const [passwordMessage, setPasswordMessage] = useState("");
const [passwordSaving, setPasswordSaving] = useState(false);

async function handlePasswordChange(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();
setPasswordMessage("");
if (newPassword.length < 8) {
setPasswordMessage("Password must be at least 8 characters.");
return;
}
if (newPassword !== confirmPassword) {
setPasswordMessage("Passwords do not match.");
return;
}
const supabase = supabaseBrowser();
if (!supabase) {
setPasswordMessage("Password update is currently unavailable.");
return;
}
setPasswordSaving(true);
const result = await supabase.auth.updateUser({ password: newPassword });
setPasswordSaving(false);
if (result.error) {
setPasswordMessage(result.error.message);
} else {
setPasswordMessage("Password updated successfully.");
setNewPassword("");
setConfirmPassword("");
}
}

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
<form onSubmit={handlePasswordChange} className="soft-panel mt-5 grid gap-4 p-5 md:grid-cols-2">
<div className="md:col-span-2"><h2 className="text-xl font-black text-legacy-ink">Change password</h2>
<p className="mt-1 text-sm text-legacy-muted">Update the password you use to sign in to this portal.</p>
</div>
<label className="grid gap-2 font-bold text-legacy-ink">
New password
<input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="rounded-lg border border-legacy-silver px-3 py-3 font-normal" minLength={8} required /></label>
<label className="grid gap-2 font-bold text-legacy-ink">
Confirm new password
<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="rounded-lg border border-legacy-silver px-3 py-3 font-normal" minLength={8} required /></label>
<div className="md:col-span-2">
<button disabled={passwordSaving} className="rounded-lg bg-legacy-purple px-5 py-3 font-black text-white disabled:opacity-50">{passwordSaving ? "Saving..." : "Update password"}</button>
{passwordMessage ? <p className="mt-3 text-sm text-legacy-plum">{passwordMessage}</p> : null}
</div>
</form>
</>
);
}

const CATEGORY_TO_FOLDER: Record<string, string> = {
  "General Onboarding": "Welcome Packet",
  "Agreements": "Agreements",
  "Welcome Packets": "Welcome Packet",
  "Service Guides": "Service Guides",
  "Checklists": "Checklists",
  "Resources": "Resources",
  "Billing": "Billing",
  "Completed Work Templates": "Completed Work"
}

const SERVICE_SLUG_TO_DOCUMENT_CATEGORY: Record<string, string> = {
  tax: "Tax",
  credit: "Credit",
  bookkeeping: "Bookkeeping",
  "life-insurance": "Life Insurance",
  "business-funding": "Business Funding",
  "financial-coaching": "Financial Coaching"
}

async function assignServiceToClient(
  supabase: ReturnType<typeof supabaseBrowser>,
  params: { clientId: string; serviceId: string; serviceSlug: string; serviceName: string; stages?: string[] }
): Promise<{ error: string | null; alreadyAssigned?: boolean }> {
  if (!supabase) return { error: "No connection available." }

  const existing = await supabase
    .from("client_services")
    .select("id")
    .eq("client_id", params.clientId)
    .eq("service_id", params.serviceId)
    .maybeSingle()

  if (existing.data) {
    return { error: null, alreadyAssigned: true }
  }

  const firstStage = (params.stages && params.stages[0]) || "Getting started"

  const insertResult = await supabase.from("client_services").insert({
    client_id: params.clientId,
    service_id: params.serviceId,
    current_stage: firstStage,
    progress: 0,
    admin_notes: null,
    next_step: null,
    last_updated: new Date().toISOString()
  })

  if (insertResult.error) {
    return { error: insertResult.error.message }
  }

  const userResult = await supabase.auth.getUser()
  const adminUserId = userResult.data.user?.id || null

  const rulesResult = await supabase
    .from("document_automation_rules")
    .select("master_document_id, master_documents(name, category, service_slug, storage_path)")
    .eq("trigger_event", "service_added")
    .eq("service_slug", params.serviceSlug)

  const rules: any[] = rulesResult.data || []
  const documentCategory = SERVICE_SLUG_TO_DOCUMENT_CATEGORY[params.serviceSlug] || "General"

  for (const rule of rules) {
    const masterDoc = rule.master_documents
    if (!masterDoc) continue
    const folder = CATEGORY_TO_FOLDER[masterDoc.category] || "Resources"
    let clientStoragePath = ""

    if (masterDoc.storage_path) {
      const downloadResult = await supabase.storage.from("MASTER DOCUMENTS").download(masterDoc.storage_path)
      if (downloadResult.data) {
        const fileName = masterDoc.storage_path.split("/").pop() || masterDoc.name
        const path = `${params.clientId}/${folder}/${Date.now()}-${fileName}`
        const uploadResult = await supabase.storage.from("CLIENT DOCUMENTS").upload(path, downloadResult.data)
        if (!uploadResult.error) {
          clientStoragePath = path
        }
      }
    }

    await supabase.from("documents").insert({
      client_id: params.clientId,
      uploaded_by: adminUserId,
      name: masterDoc.name,
      storage_path: clientStoragePath,
      category: documentCategory,
      status: "Assigned",
      folder,
      visible_to_client: true,
      master_document_id: rule.master_document_id,
      service_slug: params.serviceSlug
    })
  }

  await supabase.from("client_timeline").insert({
    client_id: params.clientId,
    event_type: "service_added",
    title: `Service added: ${params.serviceName}`,
    description: `${params.serviceName} was added to this client's account.`,
    metadata: { service_id: params.serviceId, service_slug: params.serviceSlug }
  })

  await supabase.from("notifications").insert({
    client_id: params.clientId,
    title: "New service added",
    body: `${params.serviceName} has been added to your account. Check your dashboard for next steps.`,
    kind: "service_added"
  })

  return { error: null, alreadyAssigned: false }
}

function AdminHome() {
const [stats, setStats] = useState({ clients: 0, documents: 0, unread: 0, billingCents: 0 });
const [attentionClients, setAttentionClients] = useState<
{ id: string; name: string; email: string; preferredContact: string; needsDocument: boolean }[]
>([]);
const [pendingRequests, setPendingRequests] = useState<
{ id: string; clientId: string; serviceId: string; serviceSlug: string; stages: string[]; clientName: string; serviceName: string; createdAt: string }[]
  >([])
  const [requestBusyId, setRequestBusyId] = useState<string | null>(null)
  const [requestFeedback, setRequestFeedback] = useState<{ id: string; message: string } | null>(null);
  
useEffect(() => {
const supabase = supabaseBrowser();
if (!supabase) return;

(async () => {
const [clientsResult, documentsResult, needsUpdateResult, messagesResult, invoicesResult] = await Promise.all([
supabase.from("clients").select("id, profiles(full_name, email, preferred_contact)"),
supabase.from("documents").select("id, status"),
supabase.from("documents").select("client_id").eq("status", "Needs update"),
supabase.from("messages").select("id").is("read_at", null),
supabase.from("invoices").select("amount_cents").eq("status", "Due")
]);

const clientRows: any = clientsResult.data || [];
const documentRows: any = documentsResult.data || [];
const needsUpdateRows: any = needsUpdateResult.data || [];
const messageRows: any = messagesResult.data || [];
const invoiceRows: any = invoicesResult.data || [];

const needsDocSet = new Set(needsUpdateRows.map((row: any) => row.client_id));
const billingCents = invoiceRows.reduce((sum: number, row: any) => sum + (row.amount_cents || 0), 0);

setStats({
clients: clientRows.length,
documents: documentRows.length,
unread: messageRows.length,
billingCents
});

setAttentionClients(
clientRows.map((row: any) => ({
id: row.id,
name: row.profiles?.full_name || "Unknown client",
email: row.profiles?.email || "",
preferredContact: row.profiles?.preferred_contact || "Email",
needsDocument: needsDocSet.has(row.id)
}))
);

  const serviceRequestsResult = await supabase
  .from("service_requests")
  .select("id, created_at, client_id, service_id, clients(profiles(full_name)), services(id, slug, name, stages)")
  .eq("status", "pending")
  .order("created_at", { ascending: false });

  const serviceRequestRows: any = serviceRequestsResult.data || [];
  setPendingRequests(
    serviceRequestRows.map((row: any) => ({
      id: row.id,
      clientId: row.client_id,
      serviceId: row.service_id,
      serviceSlug: row.services?.slug || "",
      stages: row.services?.stages || [],
      clientName: row.clients?.profiles?.full_name || "Unknown client",
      serviceName: row.services?.name || "Unknown service",
      createdAt: row.created_at
    }))
    );
})();
}, []);

  async function respondToRequest(
    request: { id: string; clientId: string; serviceId: string; serviceSlug: string; stages: string[]; serviceName: string },
    decision: "approved" | "declined"
  ) {
    const supabase = supabaseBrowser();
    if (!supabase) return;
    setRequestBusyId(request.id);
    setRequestFeedback(null);

    if (decision === "approved") {
      const assignResult = await assignServiceToClient(supabase, {
        clientId: request.clientId,
        serviceId: request.serviceId,
        serviceSlug: request.serviceSlug,
        serviceName: request.serviceName,
        stages: request.stages
      });
      if (assignResult.error) {
        setRequestFeedback({ id: request.id, message: assignResult.error });
        setRequestBusyId(null);
        return;
      }
    }

    const userResult = await supabase.auth.getUser();
    const adminUserId = userResult.data.user?.id || null;

    const updateResult = await supabase
      .from("service_requests")
      .update({ status: decision, reviewed_by: adminUserId, reviewed_at: new Date().toISOString() })
      .eq("id", request.id);

    if (updateResult.error) {
      setRequestFeedback({ id: request.id, message: updateResult.error.message });
      setRequestBusyId(null);
      return;
    }

    setPendingRequests((prev) => prev.filter((item) => item.id !== request.id));
    setRequestBusyId(null);
  }


return (
<>
<PageHeader
eyebrow="Admin"
title="Business owner dashboard"
description="View clients, update service status, check documents, send messages, and manage placeholder billing."
action={<button className="inline-flex items-center gap-2 rounded-lg bg-legacy-purple px-5 py-3 font-black text-white"><Plus size={18} /> Add client</button>}
/>
<div className="grid gap-4 md:grid-cols-4">
<StatCard label="Clients" value={String(stats.clients)} note="Active portal clients." icon={Users} />
<StatCard label="Documents" value={String(stats.documents)} note="Files waiting in review." icon={FolderUp} />
<StatCard label="Unread" value={String(stats.unread)} note="Messages needing response." icon={MessageSquare} />
<StatCard label="Open billing" value={`$${(stats.billingCents / 100).toLocaleString()}`} note="Total currently due." icon={Banknote} />
</div>
<section className="soft-panel mt-5 p-5">
<h2 className="text-xl font-black text-legacy-ink">Clients needing attention</h2>
<div className="mt-4 grid gap-3">
{attentionClients.length === 0 && (
<p className="text-sm text-legacy-muted">No clients yet. Approve a lead to add your first client.</p>
)}
{attentionClients.map((client) => (
<div key={client.id} className="flex flex-col justify-between gap-3 rounded-xl border border-legacy-silver p-4 sm:flex-row sm:items-center">
<div>
<p className="font-black text-legacy-ink">{client.name}</p>
<p className="text-sm text-legacy-muted">{client.email} • {client.preferredContact}</p>
</div>
<StatusPill tone={client.needsDocument ? "amber" : "purple"}>{client.needsDocument ? "Needs document" : "On track"}</StatusPill>
</div>
))}
</div>
</section>
  <section className="soft-panel mt-5 p-5">
  <h2 className="text-xl font-black text-legacy-ink">Service requests</h2>
  <div className="mt-4 grid gap-3">
    {pendingRequests.length === 0 && (
  <p className="text-sm text-legacy-muted">No pending service requests.</p>
  )}
    {pendingRequests.map((request) => (
  <div key={request.id} className="flex flex-col justify-between gap-3 rounded-xl border border-legacy-silver p-4 sm:flex-row sm:items-center">
  <div>
  <p className="font-black text-legacy-ink">{request.clientName}</p>
  <p className="text-sm text-legacy-muted">Interested in: {request.serviceName}</p>
  {requestFeedback && requestFeedback.id === request.id ? (
    <p className="mt-1 text-xs text-red-600">{requestFeedback.message}</p>
  ) : null}
  </div>
  <div className="flex items-center gap-2">
    <button
      onClick={() => respondToRequest(request, "approved")}
      disabled={requestBusyId === request.id}
      className="rounded-lg bg-legacy-purple px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
    >
      {requestBusyId === request.id ? "Working..." : "Approve"}
    </button>
    <button
      onClick={() => respondToRequest(request, "declined")}
      disabled={requestBusyId === request.id}
      className="rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-plum disabled:opacity-50"
    >
      Decline
    </button>
  </div>
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
const [clientRows, setClientRows] = useState<
{ id: string; name: string; email: string; services: string; status: string; nextStep: string; assignedServiceIds: string[] }[]
>([]);
const [sendingId, setSendingId] = useState<string | null>(null);
const [feedback, setFeedback] = useState<{ id: string; message: string } | null>(null);
const [allServices, setAllServices] = useState<{ id: string; slug: string; name: string; stages: string[] }[]>([]);
const [selectedServiceByClient, setSelectedServiceByClient] = useState<Record<string, string>>({});
const [assigningId, setAssigningId] = useState<string | null>(null);
const [assignFeedback, setAssignFeedback] = useState<{ id: string; message: string } | null>(null);

async function loadServices() {
const supabase = supabaseBrowser();
if (!supabase) return;
const result = await supabase.from("services").select("id, slug, name, stages");
setAllServices(result.data || []);
}

async function assignService(clientId: string) {
const serviceId = selectedServiceByClient[clientId];
if (!serviceId) return;
const service = allServices.find((s) => s.id === serviceId);
if (!service) return;
const supabase = supabaseBrowser();
if (!supabase) return;
setAssigningId(clientId);
setAssignFeedback(null);
const result = await assignServiceToClient(supabase, {
  clientId,
  serviceId: service.id,
  serviceSlug: service.slug,
  serviceName: service.name,
  stages: service.stages
});
if (result.error) {
  setAssignFeedback({ id: clientId, message: result.error });
} else {
  setAssignFeedback({ id: clientId, message: result.alreadyAssigned ? "Client already has this service." : "Service assigned." });
  setSelectedServiceByClient((prev) => ({ ...prev, [clientId]: "" }));
  await loadClients();
}
setAssigningId(null);
}

async function loadClients() {
const supabase = supabaseBrowser();
if (!supabase) return;

const clientsResult = await supabase
.from("clients")
.select("id, status, profiles(full_name, email), client_services(service_id, current_stage, next_step, services(name))");
const rows: any = clientsResult.data || [];

setClientRows(
rows.map((row: any) => {
const services = (row.client_services || []) as any[];
const serviceNames = services.map((cs) => cs.services?.name).filter(Boolean).join(", ");
const nextStep = services.find((cs) => cs.next_step)?.next_step;
const assignedServiceIds = services.map((cs) => cs.service_id).filter(Boolean);
return {
id: row.id,
name: row.profiles?.full_name || "Unknown client",
email: row.profiles?.email || "",
services: serviceNames || "No services assigned yet",
status: row.status || "Active",
nextStep: nextStep || "No pending next step.",
assignedServiceIds
};
})
);
}

useEffect(() => {
loadClients();
loadServices();
}, []);

async function sendAccessLink(clientId: string) {
setSendingId(clientId);
setFeedback(null);
const res = await fetch("/api/admin/send-access-link", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ clientId })
});
const json = await res.json();
setFeedback({ id: clientId, message: res.ok ? "Access link sent." : json.error || "Could not send access link." });
setSendingId(null);
}

return (
<>
<PageHeader eyebrow="Admin" title="Client management" description="Add clients, assign services, and update tracker notes." />
<div className="grid gap-5 xl:grid-cols-[1fr_24rem]">
<section className="soft-panel p-5">
<h2 className="text-xl font-black text-legacy-ink">All clients</h2>
<div className="mt-4 overflow-x-auto">
<table className="w-full min-w-[50rem] text-left">
<thead className="text-sm text-legacy-muted">
<tr>
<th className="py-3">Client</th>
<th>Assigned services</th>
<th>Status</th>
<th>Next step</th>
<th>Add service</th>
<th className="text-right">Access</th>
</tr>
</thead>
<tbody className="divide-y divide-legacy-silver">
{clientRows.length === 0 && (
<tr>
<td className="py-4 text-sm text-legacy-muted" colSpan={5}>No clients yet. Approve a lead to add your first client.</td>
</tr>
)}
{clientRows.map((client) => (
<tr key={client.id}>
<td className="py-4">
<p className="font-black text-legacy-ink">{client.name}</p>
<p className="text-sm text-legacy-muted">{client.email}</p>
</td>
<td>{client.services}</td>
<td><StatusPill>{client.status}</StatusPill></td>
<td className="text-legacy-muted">{client.nextStep}</td>
<td>
<div className="flex flex-col gap-2">
<select
className="rounded-lg border border-legacy-silver px-2 py-2 text-sm"
value={selectedServiceByClient[client.id] || ""}
onChange={(e) => setSelectedServiceByClient((prev) => ({ ...prev, [client.id]: e.target.value }))}
>
<option value="">Choose a service…</option>
{allServices
.filter((service) => !client.assignedServiceIds.includes(service.id))
.map((service) => (
<option key={service.id} value={service.id}>{service.name}</option>
))}
</select>
<button
onClick={() => assignService(client.id)}
disabled={assigningId === client.id || !selectedServiceByClient[client.id]}
className="rounded-lg bg-legacy-purple px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
>
{assigningId === client.id ? "Assigning..." : "Assign"}
</button>
{assignFeedback && assignFeedback.id === client.id ? (
<p className="text-xs text-legacy-muted">{assignFeedback.message}</p>
) : null}
</div>
</td>
<td className="text-right">
<button
onClick={() => sendAccessLink(client.id)}
disabled={sendingId === client.id}
className="rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-plum disabled:opacity-50"
>
{sendingId === client.id ? "Sending..." : "Send Access Link"}
</button>
{feedback && feedback.id === client.id ? (
<p className="mt-1 text-xs text-legacy-muted">{feedback.message}</p>
) : null}
</td>
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
const [docRows, setDocRows] = useState<any[]>([]);
const [loading, setLoading] = useState(true);

async function loadDocuments() {
const supabase = supabaseBrowser();
if (!supabase) { setLoading(false); return; }
const result = await supabase
.from("documents")
.select("id, name, storage_path, category, status, created_at, clients(profiles(full_name))")
.order("created_at", { ascending: false });
if (!result.error) {
setDocRows(result.data || []);
}
setLoading(false);
}

useEffect(() => { loadDocuments(); }, []);

async function viewDocument(storagePath: string) {
const supabase = supabaseBrowser();
if (!supabase) return;
const result = await supabase.storage.from("CLIENT DOCUMENTS").createSignedUrl(storagePath, 60);
if (result.data?.signedUrl) {
window.open(result.data.signedUrl, "_blank");
}
}

return (
<>
<PageHeader eyebrow="Admin" title="Uploaded documents" description="Review client uploads by service category and status." />
<section className="soft-panel p-5">
<div className="grid gap-3">
{loading && <p className="text-sm text-legacy-muted">Loading documents...</p>}
{!loading && docRows.length === 0 && (
<p className="text-sm text-legacy-muted">No documents uploaded yet.</p>
)}
{docRows.map((document: any) => (
<div key={document.id} className="flex flex-col justify-between gap-3 rounded-xl border border-legacy-silver p-4 sm:flex-row sm:items-center">
<div>
<p className="font-black text-legacy-ink">{document.name}</p>
<p className="text-sm text-legacy-muted">
{document.clients?.profiles?.full_name || "Unknown client"} • {document.category} • Uploaded {new Date(document.created_at).toLocaleDateString()}
</p>
</div>
<div className="flex gap-2">
<StatusPill>{document.status}</StatusPill>
<button onClick={() => viewDocument(document.storage_path)} className="rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-plum">View</button>
</div>
</div>
))}
</div>
</section>
</>
);
}

function AdminResources() {
const [resourceList, setResourceList] = useState<any[]>([]);
const [loading, setLoading] = useState(true);
const [uploading, setUploading] = useState(false);
const [error, setError] = useState("");

async function loadResources() {
const supabase = supabaseBrowser();
if (!supabase) { setLoading(false); return; }
const result = await supabase
.from("resources")
.select("id, title, description, category, storage_path, is_active, display_order")
.order("display_order", { ascending: true });
if (!result.error) setResourceList(result.data || []);
setLoading(false);
}

useEffect(() => { loadResources(); }, []);

async function addResource(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();
setError("");
const form = event.currentTarget;
const formData = new FormData(form);
const file = formData.get("file") as File | null;
const title = String(formData.get("title") || "");
const description = String(formData.get("description") || "");
const category = String(formData.get("category") || "General");
const displayOrder = Number(formData.get("displayOrder") || 0);

if (!file?.name || !title) return;

const supabase = supabaseBrowser();
if (!supabase) {
setError("Resource upload is currently unavailable.");
return;
}

setUploading(true);
const path = `${Date.now()}-${file.name}`;
const uploadResult = await supabase.storage.from("resources").upload(path, file);
if (uploadResult.error) {
setError(uploadResult.error.message);
setUploading(false);
return;
}

const insertResult = await supabase.from("resources").insert({
title,
description,
category,
storage_path: path,
is_active: true,
display_order: displayOrder
});

setUploading(false);
if (insertResult.error) {
setError(insertResult.error.message);
return;
}

form.reset();
await loadResources();
}

async function toggleActive(id: string, isActive: boolean) {
const supabase = supabaseBrowser();
if (!supabase) return;
await supabase.from("resources").update({ is_active: !isActive }).eq("id", id);
await loadResources();
}

async function deleteResource(id: string, storagePath: string) {
const supabase = supabaseBrowser();
if (!supabase) return;
if (storagePath) {
await supabase.storage.from("resources").remove([storagePath]);
}
await supabase.from("resources").delete().eq("id", id);
await loadResources();
}

async function updateOrder(id: string, displayOrder: number) {
const supabase = supabaseBrowser();
if (!supabase) return;
await supabase.from("resources").update({ display_order: displayOrder }).eq("id", id);
await loadResources();
}

return (
<>
<PageHeader
eyebrow="Admin"
title="Resource library"
description="Upload resources for clients. Active resources appear automatically in the client portal, ordered by display order."
/>
<section className="grid gap-5 xl:grid-cols-[24rem_1fr]">
<form onSubmit={addResource} className="soft-panel grid content-start gap-4 p-5">
<h2 className="text-xl font-black text-legacy-ink">Add resource</h2>
<input name="title" className="rounded-lg border border-legacy-silver px-3 py-3" placeholder="Resource name" required />
<textarea name="description" className="rounded-lg border border-legacy-silver px-3 py-3" rows={3} placeholder="Description" />
<select name="category" className="rounded-lg border border-legacy-silver px-3 py-3" defaultValue="General">
{categories.map((category) => (
<option key={category}>{category}</option>
))}
</select>
<label className="grid gap-2 font-bold text-legacy-ink">
Display order
<input name="displayOrder" type="number" defaultValue={0} className="rounded-lg border border-legacy-silver px-3 py-3 font-normal" />
</label>
<label className="grid gap-3 rounded-2xl border border-dashed border-legacy-purple bg-legacy-lavender/60 p-5 text-center font-bold text-legacy-plum">
<Upload className="mx-auto" size={28} />
Select a file
<input name="file" type="file" className="sr-only" required />
</label>
<button disabled={uploading} className="rounded-lg bg-legacy-purple px-5 py-3 font-black text-white disabled:opacity-50">
{uploading ? "Uploading..." : "Add resource"}
</button>
{error ? <p className="rounded-lg bg-legacy-lavender p-3 text-sm text-legacy-plum">{error}</p> : null}
</form>

<div className="soft-panel p-5">
<h2 className="text-xl font-black text-legacy-ink">All resources</h2>
<div className="mt-4 grid gap-3">
{loading && <p className="text-sm text-legacy-muted">Loading resources...</p>}
{!loading && resourceList.length === 0 && (
<p className="text-sm text-legacy-muted">No resources yet. Add your first resource.</p>
)}
{resourceList.map((resource) => (
<div key={resource.id} className="grid gap-3 rounded-xl border border-legacy-silver p-4 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
<div>
<p className="font-black text-legacy-ink">{resource.title}</p>
<p className="text-sm text-legacy-muted">{resource.category}</p>
</div>
<input
type="number"
defaultValue={resource.display_order}
onBlur={(event) => updateOrder(resource.id, Number(event.target.value))}
className="w-20 rounded-lg border border-legacy-silver px-2 py-2 text-sm"
/>
<button
onClick={() => toggleActive(resource.id, resource.is_active)}
className="rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-plum"
>
{resource.is_active ? "Deactivate" : "Activate"}
</button>
<button
onClick={() => deleteResource(resource.id, resource.storage_path)}
className="inline-flex items-center gap-2 rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-muted"
>
<Trash2 size={16} /> Delete
</button>
</div>
))}
</div>
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
const [invoiceRows, setInvoiceRows] = useState<any[]>([]);
const [loading, setLoading] = useState(true);

async function loadInvoices() {
const supabase = supabaseBrowser();
if (!supabase) { setLoading(false); return; }
const result = await supabase
.from("invoices")
.select("id, label, amount_cents, due_date, status, clients(profiles(full_name))")
.order("due_date", { ascending: true });
if (!result.error) setInvoiceRows(result.data || []);
setLoading(false);
}

useEffect(() => { loadInvoices(); }, []);

async function updateStatus(id: string, status: string) {
const supabase = supabaseBrowser();
if (!supabase) return;
await supabase.from("invoices").update({ status }).eq("id", id);
await loadInvoices();
}

function formatCents(cents: number) {
return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

return (
<>
<PageHeader eyebrow="Admin" title="Billing" description="Review client invoices and update payment status. Connect Stripe or payment links later." />
<section className="soft-panel p-5">
<div className="grid gap-3">
{loading && <p className="text-sm text-legacy-muted">Loading invoices...</p>}
{!loading && invoiceRows.length === 0 && (
<p className="text-sm text-legacy-muted">No invoices yet.</p>
)}
{invoiceRows.map((invoice: any) => (
<div key={invoice.id} className="grid gap-3 rounded-xl border border-legacy-silver p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
<div>
<p className="font-black text-legacy-ink">{invoice.label}</p>
<p className="text-sm text-legacy-muted">
{invoice.clients?.profiles?.full_name || "Unknown client"} • Due {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "-"}
</p>
</div>
<p className="font-black text-legacy-ink">{formatCents(invoice.amount_cents || 0)}</p>
<select
className="rounded-lg border border-legacy-silver px-3 py-2"
value={invoice.status}
onChange={(event) => updateStatus(invoice.id, event.target.value)}
>
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
