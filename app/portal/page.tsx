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
import { AdminSignatures } from "@/components/admin-signatures";

const categories: DocumentCategory[] = ["Tax", "Credit", "Bookkeeping", "Life Insurance", "General"];

export default function PortalPage() {
const [role, setRole] = useState<UserRole>("client");
const [active, setActive] = useState("dashboard");
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
{active === "notifications" && <Notifications clientId={realClientId} />}
{active === "messages" && (
<Messages clientId={realClientId} />
)}
{active === "documents" && <Documents clientId={realClientId} />}
  {active === "status" && <ServiceStatus clientId={realClientId} />}
{active === "appointments" && <Appointments appointments={displayAppointments} clientId={realClientId} />}
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
  {active === "admin-signatures" && <AdminSignatures />}
{active === "admin-resources" && <AdminResources />}
{active === "admin-messages" && <AdminMessages />}
{active === "admin-scheduling" && <AdminScheduling />}
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

function Messages({ clientId }: { clientId: string | null }) {
  const [thread, setThread] = useState<
    { id: string; body: string; sender_id: string; created_at: string }[]
  >([]);
  const [messageText, setMessageText] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    const supabase = supabaseBrowser();
    if (!supabase) return;
    let active = true;

    async function load() {
      if (!supabase) return;
      const { data: userData } = await supabase.auth.getUser();
      if (active) setUserId(userData.user?.id || null);
      const { data } = await supabase
        .from("messages")
        .select("id, body, sender_id, created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: true });
      if (active) setThread(data || []);
    }

    load();
    const channel = supabase
      .channel(`messages-client-${clientId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `client_id=eq.${clientId}` },
        () => load()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [clientId]);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientId || !messageText.trim()) return;
    const supabase = supabaseBrowser();
    if (!supabase) return;
    setSending(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setSending(false);
      return;
    }
    await supabase.from("messages").insert({
      client_id: clientId,
      sender_id: userData.user.id,
      body: messageText.trim()
    });
    setMessageText("");
    const { data } = await supabase
      .from("messages")
      .select("id, body, sender_id, created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true });
    setThread(data || []);
    setSending(false);
  }

  return (
    <>
      <PageHeader
        eyebrow="Messages"
        title="Message center"
        description="Ask questions, reply to requests, and keep financial conversations in one secure place."
      />
      <section className="soft-panel flex h-[32rem] flex-col p-5">
        <div className="flex-1 space-y-4 overflow-auto py-2">
          {thread.length === 0 && (
            <p className="text-sm text-legacy-muted">No messages yet. Send a message to get started.</p>
          )}
          {thread.map((message) => (
            <div
              key={message.id}
              className={`max-w-[82%] rounded-2xl p-4 ${
                message.sender_id === userId ? "ml-auto bg-legacy-purple text-white" : "bg-legacy-lavender text-legacy-ink"
              }`}
            >
              <p className="leading-7">{message.body}</p>
              <p className={`mt-2 text-xs font-bold ${message.sender_id === userId ? "text-white/70" : "text-legacy-muted"}`}>
                {new Date(message.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
        <form onSubmit={sendMessage} className="flex flex-col gap-3 border-t border-legacy-silver pt-4 sm:flex-row">
          <input
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-legacy-silver px-4 py-3"
            placeholder="Write a message..."
            required
          />
          <button
            disabled={sending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-legacy-purple px-5 py-3 font-black text-white disabled:opacity-50"
          >
            <Send size={18} /> Send
          </button>
        </form>
      </section>
    </>
  );
}

function Notifications({ clientId }: { clientId: string | null }) {
const [notificationRows, setNotificationRows] = useState<any[]>([]);
const [loading, setLoading] = useState(true);
const [busyId, setBusyId] = useState<string | null>(null);

async function loadNotifications() {
const supabase = supabaseBrowser();
if (!supabase || !clientId) { setLoading(false); return; }
const result = await supabase
.from("notifications")
.select("id, title, body, kind, read_at, created_at")
.eq("client_id", clientId)
.order("created_at", { ascending: false });
if (!result.error) setNotificationRows(result.data || []);
setLoading(false);
}

useEffect(() => {
loadNotifications();
}, [clientId]);

async function markRead(id: string) {
const supabase = supabaseBrowser();
if (!supabase) return;
setBusyId(id);
await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
await loadNotifications();
setBusyId(null);
}

async function markAllRead() {
const supabase = supabaseBrowser();
if (!supabase || !clientId) return;
await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("client_id", clientId).is("read_at", null);
await loadNotifications();
}

const unreadCount = notificationRows.filter((n) => !n.read_at).length;

return (
<>
<PageHeader
eyebrow="Notifications"
title="Notification center"
description="Stay up to date on documents, invoices, services, and messages."
action={unreadCount > 0 ? <button onClick={markAllRead} className="rounded-lg border border-legacy-silver px-5 py-3 font-black text-legacy-plum">Mark all as read</button> : undefined}
/>
<section className="soft-panel p-5">
<div className="grid gap-3">
{loading && <p className="text-sm text-legacy-muted">Loading notifications...</p>}
{!loading && notificationRows.length === 0 && <p className="text-sm text-legacy-muted">No notifications yet.</p>}
{notificationRows.map((note) => (
<div key={note.id} className={"flex items-start justify-between gap-3 rounded-xl border p-4 " + (note.read_at ? "border-legacy-silver" : "border-legacy-purple bg-legacy-lavender/40")}>
<div className="flex gap-3">
<Bell size={18} className="mt-1 shrink-0 text-legacy-purple" />
<div>
<p className="font-black text-legacy-ink">{note.title}</p>
<p className="mt-1 text-sm leading-6 text-legacy-muted">{note.body}</p>
<p className="mt-2 text-xs font-bold text-legacy-muted">{new Date(note.created_at).toLocaleString()}</p>
</div>
</div>
{!note.read_at ? (
<button onClick={() => markRead(note.id)} disabled={busyId === note.id} className="shrink-0 rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-ink disabled:opacity-50">
{busyId === note.id ? "..." : "Mark read"}
</button>
) : null}
</div>
))}
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
const [uploadCategory, setUploadCategory] = useState("General");
const [uploadTaxYear, setUploadTaxYear] = useState("");
  const [signingDoc, setSigningDoc] = useState<any | null>(null);
const [signingUrl, setSigningUrl] = useState<string | null>(null);
const [signingLoading, setSigningLoading] = useState(false);
const [signingError, setSigningError] = useState("");
const [consentChecked, setConsentChecked] = useState(false);

async function loadDocuments() {
const supabase = supabaseBrowser();
if (!supabase || !clientId) {
setLoading(false);
return;
}
const result = await supabase
.from("documents")
.select("id, name, storage_path, category, status, folder, tax_year, created_at, requires_signature, signature_request_id")
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
category: uploadCategory,
folder: "Uploaded by Client",
tax_year: uploadCategory === "Tax" && uploadTaxYear ? Number(uploadTaxYear) : null,
visible_to_client: true,
status: "Received"
});

setUploading(false);
if (insertResult.error) {
setError(insertResult.error.message);
return;
}

await supabase.from("client_timeline").insert({
client_id: clientId,
event_type: "document_uploaded",
title: "Document uploaded: " + file.name,
description: "You uploaded a document to your vault.",
metadata: { document_name: file.name }
});

form.reset();
setSelectedFile(null);
setUploadCategory("General");
setUploadTaxYear("");
await loadDocuments();
}

async function viewDocument(storagePath: string) {
const newTab = window.open("", "_blank");
const supabase = supabaseBrowser();
if (!supabase) { newTab?.close(); return; }
let result = await supabase.storage.from("CLIENT DOCUMENTS").createSignedUrl(storagePath, 60);
  if (!result.data?.signedUrl) {
    result = await supabase.storage.from("SIGNED DOCUMENTS").createSignedUrl(storagePath, 60);
  }
if (result.data?.signedUrl && newTab) {
newTab.location.href = result.data.signedUrl;
} else {
setError("Unable to open this file. It may no longer exist in storage.");
newTab?.close();
}
  
}

async function startSigning(doc: any) {
setSigningError("");
setConsentChecked(false);
setSigningUrl(null);
if (!doc.signature_request_id) {
setSigningError("This agreement is not ready to sign yet.");
return;
}
setSigningDoc(doc);
}

async function beginEmbeddedSigning(consent: boolean) {
if (!signingDoc) return;
setSigningLoading(true);
setSigningError("");
const response = await fetch("/api/signatures/signing-url", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ signatureRequestId: signingDoc.signature_request_id, consent })
});
const result = await response.json().catch(() => ({}));
setSigningLoading(false);
if (!response.ok || !result.ok) {
setSigningError(result.error || "Unable to start the signing session.");
return;
}
setSigningUrl(result.url);
}

function closeSigning() {
setSigningDoc(null);
setSigningUrl(null);
setSigningError("");
setConsentChecked(false);
}

async function handleSigningIframeLoad(event: React.SyntheticEvent<HTMLIFrameElement>) {
try {
const frame = event.currentTarget;
const href = frame.contentWindow?.location.href;
if (href && href.includes("/portal") && href.includes("signing=")) {
closeSigning();
await loadDocuments();
}
} catch {
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
<select className="rounded-lg border border-legacy-silver px-3 py-3" value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}>
<option value="General">General</option>
<option value="Tax">Tax</option>
<option value="Credit">Credit</option>
<option value="Bookkeeping">Bookkeeping</option>
<option value="Life Insurance">Life Insurance</option>
</select>
{uploadCategory === "Tax" ? (
<select className="rounded-lg border border-legacy-silver px-3 py-3" value={uploadTaxYear} onChange={(e) => setUploadTaxYear(e.target.value)}>
<option value="">Tax year (optional)</option>
{Array.from({ length: 7 }).map((_, i) => {
const year = new Date().getFullYear() - i;
return <option key={year} value={year}>{year}</option>;
})}
</select>
) : null}
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
<StatusPill tone={document.status === "Needs update" ? "amber" : document.status === "Signature Required" ? "purple" : "green"}>{document.status}</StatusPill></p>
</div>
<div className="flex gap-2">
<button
onClick={() => viewDocument(document.storage_path)}
className="rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-ink"
>
View
</button>
  {(document.status === "Signature Required" || document.requires_signature) && document.status !== "Signed" ? (
<button
onClick={() => startSigning(document)}
className="rounded-lg bg-legacy-purple px-3 py-2 text-sm font-bold text-white"
>
Review & Sign
</button>
) : null}
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
  {signingDoc ? (
<div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
<div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-soft">
<div className="mb-4 flex items-center justify-between gap-3">
<h2 className="text-lg font-black text-legacy-ink">Review & sign: {signingDoc.name}</h2>
<button onClick={closeSigning} className="rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-ink">
Close
</button>
</div>
{signingError ? <p className="mb-3 rounded-lg bg-legacy-lavender p-3 text-sm text-legacy-plum">{signingError}</p> : null}
{!signingUrl ? (
<div className="grid gap-4">
<label className="flex items-start gap-3 rounded-xl border border-legacy-silver p-4 text-sm text-legacy-muted">
<input
type="checkbox"
checked={consentChecked}
onChange={(event) => setConsentChecked(event.target.checked)}
className="mt-1"
/>
I consent to use electronic records and electronic signatures to sign this agreement.
</label>
<button
disabled={!consentChecked || signingLoading}
onClick={() => beginEmbeddedSigning(true)}
className="rounded-lg bg-legacy-purple px-5 py-3 font-black text-white disabled:opacity-50"
>
{signingLoading ? "Preparing..." : "Continue to signing"}
</button>
</div>
) : (
<iframe
src={signingUrl}
onLoad={handleSigningIframeLoad}
className="h-[70vh] w-full rounded-xl border border-legacy-silver"
title="Sign your agreement"
/>
)}
</div>
</div>
) : null}
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
  const [dependents, setDependents] = useState<any[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [newDependentName, setNewDependentName] = useState("");
  const [newDependentDob, setNewDependentDob] = useState("");
  const [newDependentRelationship, setNewDependentRelationship] = useState("");
  const [savingDependent, setSavingDependent] = useState(false);
  const [newBeneficiaryName, setNewBeneficiaryName] = useState("");
  const [newBeneficiaryRelationship, setNewBeneficiaryRelationship] = useState("");
  const [newBeneficiaryPercentage, setNewBeneficiaryPercentage] = useState("");
  const [newBeneficiaryContact, setNewBeneficiaryContact] = useState("");
  const [savingBeneficiary, setSavingBeneficiary] = useState(false);

  async function loadServices() {
    const supabase = supabaseBrowser();
    if (!supabase || !clientId) {
      setLoadingServices(false);
      return;
    }

    const [enrolledResult, allServicesResult, requestsResult, dependentsResult, beneficiariesResult] = await Promise.all([
      supabase
      .from("client_services")
      .select("id, current_stage, progress, admin_notes, next_step, last_updated, services(id, slug, name, stages)")
      .eq("client_id", clientId),
      supabase.from("services").select("id, slug, name, stages"),
      supabase.from("service_requests").select("service_id, status").eq("client_id", clientId),
      supabase.from("dependents").select("id, full_name, date_of_birth, relationship, created_at").eq("client_id", clientId).order("created_at", { ascending: true }),
      supabase.from("beneficiaries").select("id, full_name, relationship, allocation_percentage, contact_info, created_at").eq("client_id", clientId).order("created_at", { ascending: true })
      ]);

    const enrolledRows: any[] = enrolledResult.data || [];
    const allServiceRows: any[] = allServicesResult.data || [];
    const requestRows: any[] = requestsResult.data || [];

    setEnrolled(enrolledRows);
    setRequestedIds(requestRows.filter((row: any) => row.status === "pending").map((row: any) => row.service_id));

    const enrolledServiceIds = enrolledRows.map((row: any) => row.services?.id);
    setAvailable(allServiceRows.filter((service: any) => !enrolledServiceIds.includes(service.id)));

    setDependents(dependentsResult.data || []);
    setBeneficiaries(beneficiariesResult.data || []);
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


  async function addDependentEntry() {
    if (!clientId || !newDependentName.trim()) return;
    const supabase = supabaseBrowser();
    if (!supabase) return;
    setSavingDependent(true);
    await supabase.from("dependents").insert({
      client_id: clientId,
      full_name: newDependentName.trim(),
      date_of_birth: newDependentDob || null,
      relationship: newDependentRelationship.trim() || null
    });
    setNewDependentName("");
    setNewDependentDob("");
    setNewDependentRelationship("");
    const { data } = await supabase
      .from("dependents")
      .select("id, full_name, date_of_birth, relationship, created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true });
    setDependents(data || []);
    setSavingDependent(false);
  }

  async function removeDependentEntry(id: string) {
    if (!clientId) return;
    const supabase = supabaseBrowser();
    if (!supabase) return;
    await supabase.from("dependents").delete().eq("id", id);
    const { data } = await supabase
      .from("dependents")
      .select("id, full_name, date_of_birth, relationship, created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true });
    setDependents(data || []);
  }

  async function addBeneficiaryEntry() {
    if (!clientId || !newBeneficiaryName.trim()) return;
    const supabase = supabaseBrowser();
    if (!supabase) return;
    setSavingBeneficiary(true);
    await supabase.from("beneficiaries").insert({
      client_id: clientId,
      full_name: newBeneficiaryName.trim(),
      relationship: newBeneficiaryRelationship.trim() || null,
      allocation_percentage: newBeneficiaryPercentage ? Number(newBeneficiaryPercentage) : null,
      contact_info: newBeneficiaryContact.trim() || null
    });
    setNewBeneficiaryName("");
    setNewBeneficiaryRelationship("");
    setNewBeneficiaryPercentage("");
    setNewBeneficiaryContact("");
    const { data } = await supabase
      .from("beneficiaries")
      .select("id, full_name, relationship, allocation_percentage, contact_info, created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true });
    setBeneficiaries(data || []);
    setSavingBeneficiary(false);
  }

  async function removeBeneficiaryEntry(id: string) {
    if (!clientId) return;
    const supabase = supabaseBrowser();
    if (!supabase) return;
    await supabase.from("beneficiaries").delete().eq("id", id);
    const { data } = await supabase
      .from("beneficiaries")
      .select("id, full_name, relationship, allocation_percentage, contact_info, created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true });
    setBeneficiaries(data || []);
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
        {service?.slug === "tax" && (
          <div className="mt-5 rounded-xl border border-legacy-silver p-4">
            <p className="mb-2 font-black text-legacy-ink">Dependents</p>
            {dependents.length === 0 && <p className="text-sm text-legacy-muted">No dependents added yet.</p>}
            <div className="grid gap-2">
              {dependents.map((dep) => (
                <div key={dep.id} className="flex items-center justify-between rounded-lg border border-legacy-silver px-3 py-2 text-sm">
                  <span>
                    {dep.full_name}
                    {dep.relationship ? ` • ${dep.relationship}` : ""}
                    {dep.date_of_birth ? ` • ${dep.date_of_birth}` : ""}
                  </span>
                  <button onClick={() => removeDependentEntry(dep.id)} className="text-xs font-bold text-red-600 underline">Remove</button>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <input
                value={newDependentName}
                onChange={(event) => setNewDependentName(event.target.value)}
                className="rounded-lg border border-legacy-silver px-3 py-2 text-sm"
                placeholder="Dependent full name"
              />
              <input
                value={newDependentDob}
                onChange={(event) => setNewDependentDob(event.target.value)}
                type="date"
                className="rounded-lg border border-legacy-silver px-3 py-2 text-sm"
              />
              <input
                value={newDependentRelationship}
                onChange={(event) => setNewDependentRelationship(event.target.value)}
                className="rounded-lg border border-legacy-silver px-3 py-2 text-sm"
                placeholder="Relationship (e.g. Child, Parent)"
              />
              <button
                onClick={addDependentEntry}
                disabled={savingDependent}
                className="rounded-lg bg-legacy-purple px-4 py-2 text-sm font-black text-white disabled:opacity-50"
              >
                {savingDependent ? "Adding..." : "+ Add dependent"}
              </button>
            </div>
          </div>
        )}
        {service?.slug === "life-insurance" && (
          <div className="mt-5 rounded-xl border border-legacy-silver p-4">
            <p className="mb-2 font-black text-legacy-ink">Beneficiaries</p>
            {beneficiaries.length === 0 && <p className="text-sm text-legacy-muted">No beneficiaries added yet.</p>}
            <div className="grid gap-2">
              {beneficiaries.map((ben) => (
                <div key={ben.id} className="flex items-center justify-between rounded-lg border border-legacy-silver px-3 py-2 text-sm">
                  <span>
                    {ben.full_name}
                    {ben.relationship ? ` • ${ben.relationship}` : ""}
                    {(ben.allocation_percentage !== null && ben.allocation_percentage !== undefined) ? ` • ${ben.allocation_percentage}%` : ""}
                  </span>
                  <button onClick={() => removeBeneficiaryEntry(ben.id)} className="text-xs font-bold text-red-600 underline">Remove</button>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <input
                value={newBeneficiaryName}
                onChange={(event) => setNewBeneficiaryName(event.target.value)}
                className="rounded-lg border border-legacy-silver px-3 py-2 text-sm"
                placeholder="Beneficiary full name"
              />
              <input
                value={newBeneficiaryRelationship}
                onChange={(event) => setNewBeneficiaryRelationship(event.target.value)}
                className="rounded-lg border border-legacy-silver px-3 py-2 text-sm"
                placeholder="Relationship (e.g. Spouse, Child)"
              />
              <input
                value={newBeneficiaryPercentage}
                onChange={(event) => setNewBeneficiaryPercentage(event.target.value)}
                type="number"
                min="0"
                max="100"
                className="rounded-lg border border-legacy-silver px-3 py-2 text-sm"
                placeholder="Allocation %"
              />
              <input
                value={newBeneficiaryContact}
                onChange={(event) => setNewBeneficiaryContact(event.target.value)}
                className="rounded-lg border border-legacy-silver px-3 py-2 text-sm"
                placeholder="Contact phone or email"
              />
              <button
                onClick={addBeneficiaryEntry}
                disabled={savingBeneficiary}
                className="rounded-lg bg-legacy-purple px-4 py-2 text-sm font-black text-white disabled:opacity-50"
              >
                {savingBeneficiary ? "Adding..." : "+ Add beneficiary"}
              </button>
            </div>
          </div>
        )}
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
function Appointments({
  appointments,
  clientId
}: {
  appointments: { id: string; title: string; date: string; time: string; status: string }[];
  clientId: string | null;
}) {
  const [showRequest, setShowRequest] = useState(false);
  const [requestText, setRequestText] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState("");

  function requestChange(appointment: { title: string; date: string; time: string }) {
    setRequestText(`Regarding "${appointment.title}" on ${appointment.date} at ${appointment.time}: `);
    setShowRequest(true);
  }

  async function sendRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientId || !requestText.trim()) return;
    const supabase = supabaseBrowser();
    if (!supabase) return;
    setSending(true);
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await supabase.from("messages").insert({
        client_id: clientId,
        sender_id: userData.user.id,
        body: `Appointment request: ${requestText.trim()}`
      });
      setFeedback("Your request has been sent. We will confirm your appointment soon.");
      setRequestText("");
      setShowRequest(false);
    }
    setSending(false);
  }

  return (
    <>
      <PageHeader
        eyebrow="Appointments"
        title="Appointments"
        description="See upcoming and past appointments, or request a new one."
        action={
          <button
            onClick={() => setShowRequest((value) => !value)}
            className="rounded-lg bg-legacy-purple px-5 py-3 font-black text-white"
          >
            Request appointment
          </button>
        }
      />
      {showRequest && (
        <form onSubmit={sendRequest} className="soft-panel mb-5 grid gap-3 p-5">
          <textarea
            value={requestText}
            onChange={(event) => setRequestText(event.target.value)}
            className="rounded-lg border border-legacy-silver px-3 py-3"
            rows={3}
            placeholder="What would you like to schedule, and when works best for you?"
            required
          />
          <button
            disabled={sending}
            className="w-fit rounded-lg bg-legacy-purple px-5 py-3 font-black text-white disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send request"}
          </button>
        </form>
      )}
      {feedback && <p className="mb-4 text-sm text-legacy-muted">{feedback}</p>}
      <div className="grid gap-5 lg:grid-cols-2">
        {["Upcoming", "Past"].map((bucket) => (
          <section key={bucket} className="soft-panel p-5">
            <h2 className="text-xl font-black text-legacy-ink">{bucket} appointments</h2>
            <div className="mt-4 grid gap-3">
              {appointments
                .filter((appointment) =>
                  bucket === "Upcoming" ? appointment.status === "Upcoming" : appointment.status !== "Upcoming"
                )
                .map((appointment) => (
                  <div key={appointment.id} className="rounded-xl border border-legacy-silver p-4">
                    <p className="font-black text-legacy-ink">{appointment.title}</p>
                    <p className="mt-1 text-legacy-muted">
                      {appointment.date} at {appointment.time}
                    </p>
                    {bucket === "Upcoming" && (
                      <button
                        onClick={() => requestChange(appointment)}
                        className="mt-3 rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-plum"
                      >
                        Request reschedule or cancellation
                      </button>
                    )}
                  </div>
                ))}
              {appointments.filter((appointment) =>
                bucket === "Upcoming" ? appointment.status === "Upcoming" : appointment.status !== "Upcoming"
              ).length === 0 && <p className="text-sm text-legacy-muted">Nothing here yet.</p>}
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
{ id: string; name: string; email: string; services: string; status: string; nextStep: string; assignedServiceIds: string[]; assignedServices: { clientServiceId: string; serviceId: string; serviceName: string; stage: string; progress: number; adminNotes: string; nextStep: string; stages: string[] }[] }[]
>([]);
const [sendingId, setSendingId] = useState<string | null>(null);
const [feedback, setFeedback] = useState<{ id: string; message: string } | null>(null);
const [allServices, setAllServices] = useState<{ id: string; slug: string; name: string; stages: string[] }[]>([]);
const [selectedServiceByClient, setSelectedServiceByClient] = useState<Record<string, string>>({});
const [assigningId, setAssigningId] = useState<string | null>(null);
const [assignFeedback, setAssignFeedback] = useState<{ id: string; message: string } | null>(null);
const [timelineClientId, setTimelineClientId] = useState<string | null>(null);
const [timelineRows, setTimelineRows] = useState<any[]>([]);
const [timelineLoading, setTimelineLoading] = useState(false);
const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
const [editStage, setEditStage] = useState("");
const [editProgress, setEditProgress] = useState(0);
const [editNotes, setEditNotes] = useState("");
const [editNextStep, setEditNextStep] = useState("");
const [savingProgress, setSavingProgress] = useState(false);
const [progressFeedback, setProgressFeedback] = useState<{ id: string; message: string } | null>(null);
const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
const [deletingId, setDeletingId] = useState<string | null>(null);
const [deleteFeedback, setDeleteFeedback] = useState<{ id: string; message: string } | null>(null);

const [profileClientId, setProfileClientId] = useState<string | null>(null);
const [profileLoading, setProfileLoading] = useState(false);
const [profileInfo, setProfileInfo] = useState<any>(null);
const [profileDocs, setProfileDocs] = useState<any[]>([]);
const [profileThread, setProfileThread] = useState<any[]>([]);
const [profileMessageText, setProfileMessageText] = useState("");
const [profileNotesDraft, setProfileNotesDraft] = useState("");
const [savingNotes, setSavingNotes] = useState(false);
const [profileUserId, setProfileUserId] = useState<string | null>(null);
const [profileDependents, setProfileDependents] = useState<any[]>([]);
const [newDependentName, setNewDependentName] = useState("");
const [newDependentDob, setNewDependentDob] = useState("");
const [newDependentRelationship, setNewDependentRelationship] = useState("");
const [savingDependent, setSavingDependent] = useState(false);
const [profileBeneficiaries, setProfileBeneficiaries] = useState<any[]>([]);
const [newBeneficiaryName, setNewBeneficiaryName] = useState("");
const [newBeneficiaryRelationship, setNewBeneficiaryRelationship] = useState("");
const [newBeneficiaryPercentage, setNewBeneficiaryPercentage] = useState("");
const [newBeneficiaryContact, setNewBeneficiaryContact] = useState("");
const [savingBeneficiary, setSavingBeneficiary] = useState(false);

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

function startEditProgress(service: { clientServiceId: string; stage: string; progress: number; adminNotes: string; nextStep: string }) {
setEditingServiceId(service.clientServiceId);
setEditStage(service.stage);
setEditProgress(service.progress);
setEditNotes(service.adminNotes);
setEditNextStep(service.nextStep);
setProgressFeedback(null);
}

function cancelEditProgress() {
setEditingServiceId(null);
}

async function saveProgress(clientId: string, clientServiceId: string, serviceName: string) {
const supabase = supabaseBrowser();
if (!supabase) return;
setSavingProgress(true);
setProgressFeedback(null);
const updateResult = await supabase
.from("client_services")
.update({
current_stage: editStage,
progress: editProgress,
admin_notes: editNotes,
next_step: editNextStep,
last_updated: new Date().toISOString()
})
.eq("id", clientServiceId);
if (updateResult.error) {
setProgressFeedback({ id: clientServiceId, message: updateResult.error.message });
setSavingProgress(false);
return;
}
await supabase.from("client_timeline").insert({
client_id: clientId,
event_type: "status_updated",
title: "Status updated: " + serviceName,
description: serviceName + " is now at \"" + editStage + "\" (" + editProgress + "%)." + (editNextStep ? " Next step: " + editNextStep : ""),
metadata: { client_service_id: clientServiceId, stage: editStage, progress: editProgress }
});
await supabase.from("notifications").insert({
client_id: clientId,
title: "Your status was updated",
body: serviceName + " is now at \"" + editStage + "\" (" + editProgress + "%).",
kind: "status_updated"
});
setSavingProgress(false);
setEditingServiceId(null);
await loadClients();
}

async function deleteClient(clientId: string) {
setDeletingId(clientId);
setDeleteFeedback(null);
const res = await fetch("/api/admin/delete-client", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ clientId })
});
const json = await res.json().catch(() => ({}));
if (res.ok && json.success) {
setConfirmDeleteId(null);
await loadClients();
} else {
setDeleteFeedback({ id: clientId, message: json.error || "Could not delete client." });
}
setDeletingId(null);
}

async function openTimeline(clientId: string) {
const supabase = supabaseBrowser();
if (!supabase) return;
setTimelineClientId(clientId);
setTimelineLoading(true);
const result = await supabase
.from("client_timeline")
.select("id, event_type, title, description, created_at")
.eq("client_id", clientId)
.order("created_at", { ascending: false });
setTimelineRows(result.data || []);
setTimelineLoading(false);
}

function closeTimeline() {
setTimelineClientId(null);
setTimelineRows([]);
}

async function openProfile(clientId: string) {
  const supabase = supabaseBrowser();
  if (!supabase) return;
  setProfileClientId(clientId);
  setProfileLoading(true);
  const { data: userData } = await supabase.auth.getUser();
  setProfileUserId(userData.user?.id || null);
    const [profileResult, docsResult, threadResult, dependentsResult, beneficiariesResult] = await Promise.all([
    supabase
      .from("clients")
      .select("id, status, client_number, client_notes, profiles(full_name, email, phone, address, emergency_contact, preferred_contact)")
      .eq("id", clientId)
      .single(),
    supabase
      .from("documents")
      .select("id, name, category, status, visible_to_client, created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false }),
    supabase
      .from("messages")
      .select("id, body, sender_id, created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true }),
      supabase
        .from("dependents")
        .select("id, full_name, date_of_birth, relationship, ssn_last4, created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: true }),
      supabase
        .from("beneficiaries")
        .select("id, full_name, relationship, allocation_percentage, contact_info, created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: true })
  ]);
  setProfileInfo(profileResult.data);
  setProfileNotesDraft((profileResult.data as any)?.client_notes || "");
  setProfileDocs(docsResult.data || []);
  setProfileThread(threadResult.data || []);
  setProfileDependents(dependentsResult.data || []);
  setProfileBeneficiaries(beneficiariesResult.data || []);
  setProfileLoading(false);
}

function closeProfile() {
  setProfileClientId(null);
  setProfileInfo(null);
  setProfileDocs([]);
  setProfileThread([]);
  setProfileNotesDraft("");
  setProfileDependents([]);
  setProfileBeneficiaries([]);
  setNewDependentName("");
  setNewDependentDob("");
  setNewDependentRelationship("");
  setNewBeneficiaryName("");
  setNewBeneficiaryRelationship("");
  setNewBeneficiaryPercentage("");
  setNewBeneficiaryContact("");
}

async function saveProfileNotes() {
  if (!profileClientId) return;
  const supabase = supabaseBrowser();
  if (!supabase) return;
  setSavingNotes(true);
  await supabase.from("clients").update({ client_notes: profileNotesDraft }).eq("id", profileClientId);
  setSavingNotes(false);
}

async function sendProfileMessage(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (!profileClientId || !profileMessageText.trim() || !profileUserId) return;
  const supabase = supabaseBrowser();
  if (!supabase) return;
  await supabase.from("messages").insert({
    client_id: profileClientId,
    sender_id: profileUserId,
    body: profileMessageText.trim()
  });
  setProfileMessageText("");
  const { data } = await supabase
    .from("messages")
    .select("id, body, sender_id, created_at")
    .eq("client_id", profileClientId)
    .order("created_at", { ascending: true });
  setProfileThread(data || []);
}

async function addDependent() {
  if (!profileClientId || !newDependentName.trim()) return;
  const supabase = supabaseBrowser();
  if (!supabase) return;
  setSavingDependent(true);
  await supabase.from("dependents").insert({
    client_id: profileClientId,
    full_name: newDependentName.trim(),
    date_of_birth: newDependentDob || null,
    relationship: newDependentRelationship.trim() || null
  });
  setNewDependentName("");
  setNewDependentDob("");
  setNewDependentRelationship("");
  const { data } = await supabase
    .from("dependents")
    .select("id, full_name, date_of_birth, relationship, ssn_last4, created_at")
    .eq("client_id", profileClientId)
    .order("created_at", { ascending: true });
  setProfileDependents(data || []);
  setSavingDependent(false);
}

async function removeDependent(id: string) {
  if (!profileClientId) return;
  const supabase = supabaseBrowser();
  if (!supabase) return;
  await supabase.from("dependents").delete().eq("id", id);
  setProfileDependents((prev) => prev.filter((row) => row.id !== id));
}

async function addBeneficiary() {
  if (!profileClientId || !newBeneficiaryName.trim()) return;
  const supabase = supabaseBrowser();
  if (!supabase) return;
  setSavingBeneficiary(true);
  await supabase.from("beneficiaries").insert({
    client_id: profileClientId,
    full_name: newBeneficiaryName.trim(),
    relationship: newBeneficiaryRelationship.trim() || null,
    allocation_percentage: newBeneficiaryPercentage ? Number(newBeneficiaryPercentage) : null,
    contact_info: newBeneficiaryContact.trim() || null
  });
  setNewBeneficiaryName("");
  setNewBeneficiaryRelationship("");
  setNewBeneficiaryPercentage("");
  setNewBeneficiaryContact("");
  const { data } = await supabase
    .from("beneficiaries")
    .select("id, full_name, relationship, allocation_percentage, contact_info, created_at")
    .eq("client_id", profileClientId)
    .order("created_at", { ascending: true });
  setProfileBeneficiaries(data || []);
  setSavingBeneficiary(false);
}

async function removeBeneficiary(id: string) {
  if (!profileClientId) return;
  const supabase = supabaseBrowser();
  if (!supabase) return;
  await supabase.from("beneficiaries").delete().eq("id", id);
  setProfileBeneficiaries((prev) => prev.filter((row) => row.id !== id));
}

async function loadClients() {
const supabase = supabaseBrowser();
if (!supabase) return;

const clientsResult = await supabase
.from("clients")
.select("id, status, profiles(full_name, email), client_services(id, service_id, current_stage, progress, admin_notes, next_step, services(name, stages))");
const rows: any = clientsResult.data || [];

setClientRows(
rows.map((row: any) => {
const services = (row.client_services || []) as any[];
const serviceNames = services.map((cs) => cs.services?.name).filter(Boolean).join(", ");
const nextStep = services.find((cs) => cs.next_step)?.next_step;
const assignedServiceIds = services.map((cs) => cs.service_id).filter(Boolean);
const assignedServices = services.map((cs: any) => ({ clientServiceId: cs.id, serviceId: cs.service_id, serviceName: cs.services?.name || "Service", stage: cs.current_stage || "", progress: typeof cs.progress === "number" ? cs.progress : 0, adminNotes: cs.admin_notes || "", nextStep: cs.next_step || "", stages: cs.services?.stages || [] }));
return {
id: row.id,
name: row.profiles?.full_name || "Unknown client",
email: row.profiles?.email || "",
services: serviceNames || "No services assigned yet",
status: row.status || "Active",
nextStep: nextStep || "No pending next step.",
assignedServices,
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
<button onClick={() => openTimeline(client.id)} className="mt-1 text-xs font-bold text-legacy-purple underline">View timeline</button>
<button onClick={() => openProfile(client.id)} className="mt-1 ml-3 text-xs font-bold text-legacy-purple underline">View profile</button>
</td>
<td>
<div className="grid gap-2">
{client.assignedServices.length === 0 ? (
<span className="text-legacy-muted">{client.services}</span>
) : (
client.assignedServices.map((service) => (
<div key={service.clientServiceId} className="rounded-lg border border-legacy-silver p-2">
<p className="font-bold text-legacy-ink">{service.serviceName}</p>
{editingServiceId === service.clientServiceId ? (
<div className="mt-2 grid gap-2">
<select className="rounded-lg border border-legacy-silver px-2 py-1 text-sm" value={editStage} onChange={(e) => setEditStage(e.target.value)}>
{service.stages.length === 0 ? <option value={editStage}>{editStage || "Getting started"}</option> : null}
{service.stages.map((stage) => (
<option key={stage} value={stage}>{stage}</option>
))}
</select>
<input type="number" min={0} max={100} className="rounded-lg border border-legacy-silver px-2 py-1 text-sm" value={editProgress} onChange={(e) => setEditProgress(Number(e.target.value))} />
<textarea className="rounded-lg border border-legacy-silver px-2 py-1 text-sm" placeholder="Admin notes" rows={2} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
<input className="rounded-lg border border-legacy-silver px-2 py-1 text-sm" placeholder="Next step" value={editNextStep} onChange={(e) => setEditNextStep(e.target.value)} />
<div className="flex gap-2">
<button onClick={() => saveProgress(client.id, service.clientServiceId, service.serviceName)} disabled={savingProgress} className="rounded-lg bg-legacy-purple px-3 py-1 text-sm font-bold text-white disabled:opacity-50">
{savingProgress ? "Saving..." : "Save"}
</button>
<button onClick={cancelEditProgress} className="rounded-lg border border-legacy-silver px-3 py-1 text-sm font-bold text-legacy-muted">Cancel</button>
</div>
{progressFeedback && progressFeedback.id === service.clientServiceId ? (
<p className="text-xs text-legacy-muted">{progressFeedback.message}</p>
) : null}
</div>
) : (
<div className="mt-1">
<p className="text-xs text-legacy-muted">{service.stage} - {service.progress}%</p>
<button onClick={() => startEditProgress(service)} className="text-xs font-bold text-legacy-purple underline">Update progress</button>
</div>
)}
</div>
))
)}
</div>
</td>
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
<div className="mt-2">
{confirmDeleteId === client.id ? (
<div className="grid gap-1">
<p className="text-xs font-bold text-red-600">Delete this client and all their data?</p>
<div className="flex gap-2">
<button onClick={() => deleteClient(client.id)} disabled={deletingId === client.id} className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white disabled:opacity-50">
{deletingId === client.id ? "Deleting..." : "Confirm delete"}
</button>
<button onClick={() => setConfirmDeleteId(null)} className="rounded-lg border border-legacy-silver px-3 py-1 text-xs font-bold text-legacy-muted">Cancel</button>
</div>
</div>
) : (
<button onClick={() => setConfirmDeleteId(client.id)} className="text-xs font-bold text-red-600 underline">Delete client</button>
)}
{deleteFeedback && deleteFeedback.id === client.id ? (
<p className="mt-1 text-xs text-legacy-muted">{deleteFeedback.message}</p>
) : null}
</div>
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
{timelineClientId ? (
<section className="soft-panel mt-5 p-5">
<div className="mb-4 flex items-center justify-between">
<h2 className="text-xl font-black text-legacy-ink">Client timeline</h2>
<button onClick={closeTimeline} className="rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-ink">Close</button>
</div>
{timelineLoading && <p className="text-sm text-legacy-muted">Loading timeline...</p>}
{!timelineLoading && timelineRows.length === 0 && <p className="text-sm text-legacy-muted">No activity recorded yet.</p>}
<div className="grid gap-3">
{timelineRows.map((row: any) => (
<div key={row.id} className="rounded-xl border border-legacy-silver p-4">
<p className="font-black text-legacy-ink">{row.title}</p>
{row.description ? <p className="mt-1 text-sm text-legacy-muted">{row.description}</p> : null}
<p className="mt-2 text-xs font-bold text-legacy-muted">{new Date(row.created_at).toLocaleString()}</p>
</div>
))}
</div>
</section>
) : null}
{profileClientId && (
  <section className="soft-panel mt-5 grid gap-5 p-5 lg:grid-cols-2">
    <div className="lg:col-span-2 mb-1 flex items-center justify-between">
      <h2 className="text-xl font-black text-legacy-ink">Client profile</h2>
      <button onClick={closeProfile} className="rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-ink">Close</button>
    </div>
    {profileLoading && <p className="text-sm text-legacy-muted">Loading profile...</p>}
    {!profileLoading && profileInfo && (
      <>
        <div className="grid gap-3">
          <div className="rounded-xl border border-legacy-silver p-4">
            <p className="font-black text-legacy-ink">{profileInfo.profiles?.full_name}</p>
            <p className="text-sm text-legacy-muted">{profileInfo.profiles?.email}</p>
            <p className="text-sm text-legacy-muted">{profileInfo.profiles?.phone}</p>
            <p className="text-sm text-legacy-muted">{profileInfo.profiles?.address}</p>
            <p className="mt-2 text-xs font-bold uppercase text-legacy-purple">
              {profileInfo.status}{profileInfo.client_number ? " . " + profileInfo.client_number : ""}
            </p>
          </div>
          <div className="rounded-xl border border-legacy-silver p-4">
            <p className="mb-2 font-black text-legacy-ink">Notes</p>
            <textarea
              value={profileNotesDraft}
              onChange={(event) => setProfileNotesDraft(event.target.value)}
              className="w-full rounded-lg border border-legacy-silver px-3 py-3"
              rows={5}
              placeholder="Internal notes about this client..."
            />
            <button
              onClick={saveProfileNotes}
              disabled={savingNotes}
              className="mt-2 rounded-lg bg-legacy-purple px-4 py-2 text-sm font-black text-white disabled:opacity-50"
            >
              {savingNotes ? "Saving..." : "Save notes"}
            </button>
          </div>
          <div className="rounded-xl border border-legacy-silver p-4">
            <p className="mb-2 font-black text-legacy-ink">Documents</p>
            {profileDocs.length === 0 && <p className="text-sm text-legacy-muted">No documents yet.</p>}
            <div className="grid gap-2">
              {profileDocs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-lg border border-legacy-silver px-3 py-2 text-sm">
                  <span>{doc.name}</span>
                  <span className="text-xs font-bold text-legacy-muted">
                    {doc.status}{doc.visible_to_client ? "" : " . Hidden from client"}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-legacy-silver p-4">
            <p className="mb-2 font-black text-legacy-ink">Tax — Dependents</p>
            {profileDependents.length === 0 && <p className="text-sm text-legacy-muted">No dependents added yet.</p>}
            <div className="grid gap-2">
              {profileDependents.map((dep) => (
                <div key={dep.id} className="flex items-center justify-between rounded-lg border border-legacy-silver px-3 py-2 text-sm">
                  <span>
                    {dep.full_name}
                    {dep.relationship ? ` • ${dep.relationship}` : ""}
                    {dep.date_of_birth ? ` • ${dep.date_of_birth}` : ""}
                  </span>
                  <button onClick={() => removeDependent(dep.id)} className="text-xs font-bold text-red-600 underline">Remove</button>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-2">
              <input
                value={newDependentName}
                onChange={(event) => setNewDependentName(event.target.value)}
                className="rounded-lg border border-legacy-silver px-3 py-2 text-sm"
                placeholder="Dependent full name"
              />
              <input
                value={newDependentDob}
                onChange={(event) => setNewDependentDob(event.target.value)}
                type="date"
                className="rounded-lg border border-legacy-silver px-3 py-2 text-sm"
              />
              <input
                value={newDependentRelationship}
                onChange={(event) => setNewDependentRelationship(event.target.value)}
                className="rounded-lg border border-legacy-silver px-3 py-2 text-sm"
                placeholder="Relationship (e.g. Child, Parent)"
              />
              <button
                onClick={addDependent}
                disabled={savingDependent}
                className="rounded-lg bg-legacy-purple px-4 py-2 text-sm font-black text-white disabled:opacity-50"
              >
                {savingDependent ? "Adding..." : "+ Add dependent"}
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-legacy-silver p-4">
            <p className="mb-2 font-black text-legacy-ink">Life Insurance — Beneficiaries</p>
            {profileBeneficiaries.length === 0 && <p className="text-sm text-legacy-muted">No beneficiaries added yet.</p>}
            <div className="grid gap-2">
              {profileBeneficiaries.map((ben) => (
                <div key={ben.id} className="flex items-center justify-between rounded-lg border border-legacy-silver px-3 py-2 text-sm">
                  <span>
                    {ben.full_name}
                    {ben.relationship ? ` • ${ben.relationship}` : ""}
                    {(ben.allocation_percentage !== null && ben.allocation_percentage !== undefined) ? ` • ${ben.allocation_percentage}%` : ""}
                  </span>
                  <button onClick={() => removeBeneficiary(ben.id)} className="text-xs font-bold text-red-600 underline">Remove</button>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-2">
              <input
                value={newBeneficiaryName}
                onChange={(event) => setNewBeneficiaryName(event.target.value)}
                className="rounded-lg border border-legacy-silver px-3 py-2 text-sm"
                placeholder="Beneficiary full name"
              />
              <input
                value={newBeneficiaryRelationship}
                onChange={(event) => setNewBeneficiaryRelationship(event.target.value)}
                className="rounded-lg border border-legacy-silver px-3 py-2 text-sm"
                placeholder="Relationship (e.g. Spouse, Child)"
              />
              <input
                value={newBeneficiaryPercentage}
                onChange={(event) => setNewBeneficiaryPercentage(event.target.value)}
                type="number"
                min="0"
                max="100"
                className="rounded-lg border border-legacy-silver px-3 py-2 text-sm"
                placeholder="Allocation %"
              />
              <input
                value={newBeneficiaryContact}
                onChange={(event) => setNewBeneficiaryContact(event.target.value)}
                className="rounded-lg border border-legacy-silver px-3 py-2 text-sm"
                placeholder="Contact phone or email"
              />
              <button
                onClick={addBeneficiary}
                disabled={savingBeneficiary}
                className="rounded-lg bg-legacy-purple px-4 py-2 text-sm font-black text-white disabled:opacity-50"
              >
                {savingBeneficiary ? "Adding..." : "+ Add beneficiary"}
              </button>
            </div>
          </div>
        </div>
        <div className="flex h-[28rem] flex-col rounded-xl border border-legacy-silver p-4">
          <p className="mb-2 font-black text-legacy-ink">Message thread</p>
          <div className="flex-1 space-y-3 overflow-auto">
            {profileThread.length === 0 && <p className="text-sm text-legacy-muted">No messages yet.</p>}
            {profileThread.map((message) => (
              <div
                key={message.id}
                className={`max-w-[85%] rounded-2xl p-3 ${
                  message.sender_id === profileUserId ? "ml-auto bg-legacy-purple text-white" : "bg-legacy-lavender text-legacy-ink"
                }`}
              >
                <p className="leading-6">{message.body}</p>
                <p
                  className={`mt-1 text-xs font-bold ${
                    message.sender_id === profileUserId ? "text-white/70" : "text-legacy-muted"
                  }`}
                >
                  {new Date(message.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
          <form onSubmit={sendProfileMessage} className="mt-3 flex gap-2 border-t border-legacy-silver pt-3">
            <input
              value={profileMessageText}
              onChange={(event) => setProfileMessageText(event.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-legacy-silver px-3 py-2"
              placeholder="Write a message..."
              required
            />
            <button className="rounded-lg bg-legacy-purple px-4 py-2 text-sm font-black text-white">Send</button>
          </form>
        </div>
      </>
    )}
  </section>
)}
</>
);
}

const ADMIN_DOCUMENT_STATUSES = ["Received", "Filed", "Needs update", "Assigned", "Archived"];
const ADMIN_DOCUMENT_CATEGORIES = ["General", "Tax", "Credit", "Bookkeeping", "Life Insurance", "Business Funding", "Financial Coaching"];
const UPLOAD_CATEGORIES = Object.keys(CATEGORY_TO_FOLDER);

function AdminDocuments() {
const [docRows, setDocRows] = useState<any[]>([]);
const [loading, setLoading] = useState(true);
const [allClients, setAllClients] = useState<{ id: string; name: string }[]>([]);
const [allServices, setAllServices] = useState<{ id: string; slug: string; name: string }[]>([]);

const [uploading, setUploading] = useState(false);
const [uploadError, setUploadError] = useState("");
const [uploadNotice, setUploadNotice] = useState("");

const [filterClient, setFilterClient] = useState("All");
const [filterService, setFilterService] = useState("All");
const [filterCategory, setFilterCategory] = useState("All");
const [filterStatus, setFilterStatus] = useState("All");
const [filterDateFrom, setFilterDateFrom] = useState("");

const [editingId, setEditingId] = useState<string | null>(null);
const [editName, setEditName] = useState("");
const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
const [busyId, setBusyId] = useState<string | null>(null);

async function loadDocuments() {
const supabase = supabaseBrowser();
if (!supabase) { setLoading(false); return; }
const result = await supabase
.from("documents")
.select("id, name, storage_path, category, status, folder, internal_notes, visible_to_client, service_slug, tax_year, created_at, client_id, clients(profiles(full_name))")
.order("created_at", { ascending: false });
if (!result.error) {
setDocRows(result.data || []);
}
setLoading(false);
}

async function loadFilters() {
const supabase = supabaseBrowser();
if (!supabase) return;
const [clientsResult, servicesResult] = await Promise.all([
supabase.from("clients").select("id, profiles(full_name)"),
supabase.from("services").select("id, slug, name")
]);
setAllClients((clientsResult.data || []).map((row: any) => ({ id: row.id, name: row.profiles?.full_name || "Unknown client" })));
setAllServices(servicesResult.data || []);
}

useEffect(() => {
loadDocuments();
loadFilters();
}, []);

async function uploadDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadError('');
    setUploadNotice('');
    const form = event.currentTarget;
    const formData = new FormData(form);
    const clientId = String(formData.get('clientId') || '');
    const name = String(formData.get('name') || '');
    const category = String(formData.get('category') || UPLOAD_CATEGORIES[0]);
    const serviceSlug = String(formData.get('serviceSlug') || '');
    const internalNotes = String(formData.get('internalNotes') || '');
    const taxYear = String(formData.get('taxYear') || '');
    const visibleToClient = formData.get('visibleToClient') === 'on';
    const notifyClient = formData.get('notifyClient') === 'on';
    const file = formData.get('file') as File | null;

    if (!clientId || !name || !file?.name) {
      setUploadError('Please choose a client, document name, and file.');
      return;
    }

    const supabase = supabaseBrowser();
    if (!supabase) {
      setUploadError('Document upload is currently unavailable.');
      return;
    }

    setUploading(true);

    const folder = CATEGORY_TO_FOLDER[category] || 'Resources';
    const documentCategory = serviceSlug ? (SERVICE_SLUG_TO_DOCUMENT_CATEGORY[serviceSlug] || 'General') : 'General';
    const userResult = await supabase.auth.getUser();
    const adminUserId = userResult.data.user?.id || null;

    const targetClientIds = clientId === '__ALL__' ? allClients.map((c) => c.id) : [clientId];
    if (targetClientIds.length === 0) {
      setUploadError('No clients found to upload to.');
      setUploading(false);
      return;
    }

    let successCount = 0;
    let lastError = '';

    for (const targetClientId of targetClientIds) {
      const path = targetClientId + '/' + folder + '/' + Date.now() + '-' + file.name;
      const uploadResult = await supabase.storage.from('CLIENT DOCUMENTS').upload(path, file);
      if (uploadResult.error) {
        lastError = uploadResult.error.message;
        continue;
      }

      const insertResult = await supabase.from('documents').insert({
        client_id: targetClientId,
        uploaded_by: adminUserId,
        name,
        storage_path: path,
        category: documentCategory,
        status: 'Filed',
        folder,
        visible_to_client: visibleToClient,
        internal_notes: internalNotes || null,
        service_slug: serviceSlug || null,
        tax_year: taxYear ? Number(taxYear) : null
      });

      if (insertResult.error) {
        lastError = insertResult.error.message;
        continue;
      }

      successCount++;

      await supabase.from('client_timeline').insert({
        client_id: targetClientId,
        event_type: 'document_uploaded',
        title: 'Document uploaded: ' + name,
        description: name + ' was added to the document vault by Tia.',
        metadata: { document_name: name }
      });

      if (notifyClient) {
        await supabase.from('notifications').insert({
          client_id: targetClientId,
          title: 'New document uploaded',
          body: name + ' has been added to your document vault.',
          kind: 'new_document'
        });
      }
    }

    form.reset();
    setUploading(false);

    if (successCount === 0) {
      setUploadError(lastError || 'Upload failed.');
    } else if (targetClientIds.length > 1) {
      setUploadNotice('Uploaded to ' + successCount + ' of ' + targetClientIds.length + ' clients.' + (notifyClient ? ' Clients notified.' : ''));
    } else {
      setUploadNotice(notifyClient ? 'Document uploaded and client notified.' : 'Document uploaded.');
    }
    await loadDocuments();
  }

async function viewDocument(storagePath: string) {
if (!storagePath) return;
const newTab = window.open("", "_blank");
const supabase = supabaseBrowser();
if (!supabase) { newTab?.close(); return; }
let result = await supabase.storage.from("CLIENT DOCUMENTS").createSignedUrl(storagePath, 60);
  if (!result.data?.signedUrl) {
    result = await supabase.storage.from("SIGNED DOCUMENTS").createSignedUrl(storagePath, 60);
  }
if (result.data?.signedUrl && newTab) {
newTab.location.href = result.data.signedUrl;
} else {
setUploadError("Unable to open this file. It may no longer exist in storage.");
newTab?.close();
}
}

function startRename(doc: any) {
setEditingId(doc.id);
setEditName(doc.name);
}

async function saveRename(doc: any) {
const supabase = supabaseBrowser();
if (!supabase) return;
await supabase.from("documents").update({ name: editName }).eq("id", doc.id);
setEditingId(null);
await loadDocuments();
}

async function moveFolder(doc: any, folder: string) {
const supabase = supabaseBrowser();
if (!supabase) return;
setBusyId(doc.id);
await supabase.from("documents").update({ folder }).eq("id", doc.id);
await loadDocuments();
setBusyId(null);
}

async function saveNotes(doc: any) {
const supabase = supabaseBrowser();
if (!supabase) return;
const notes = notesDraft[doc.id];
if (notes === undefined) return;
setBusyId(doc.id);
await supabase.from("documents").update({ internal_notes: notes || null }).eq("id", doc.id);
setBusyId(null);
await loadDocuments();
}

async function archiveDocument(doc: any) {
const supabase = supabaseBrowser();
if (!supabase) return;
setBusyId(doc.id);
await supabase.from("documents").update({ status: doc.status === "Archived" ? "Filed" : "Archived" }).eq("id", doc.id);
await loadDocuments();
setBusyId(null);
}

async function deleteDocument(doc: any) {
if (!window.confirm("Permanently delete \"" + doc.name + "\"? This cannot be undone.")) return;
const supabase = supabaseBrowser();
if (!supabase) return;
setBusyId(doc.id);
if (doc.storage_path) {
await supabase.storage.from("CLIENT DOCUMENTS").remove([doc.storage_path]);
}
await supabase.from("documents").delete().eq("id", doc.id);
await loadDocuments();
setBusyId(null);
}

const filteredDocs = docRows.filter((doc: any) => {
const clientMatch = filterClient === "All" || doc.client_id === filterClient;
const serviceMatch =
filterService === "All" ||
(filterService === "General" && !doc.service_slug) ||
doc.service_slug === filterService;
const categoryMatch = filterCategory === "All" || doc.category === filterCategory;
const statusMatch = filterStatus === "All" || doc.status === filterStatus;
const dateMatch = !filterDateFrom || new Date(doc.created_at) >= new Date(filterDateFrom);
return clientMatch && serviceMatch && categoryMatch && statusMatch && dateMatch;
});

return (
<>
<PageHeader
eyebrow="Admin"
title="Document management"
description="Upload documents directly into a client's vault, then file, rename, move, archive, or delete as needed."
/>
<section className="grid gap-5 xl:grid-cols-[24rem_1fr]">
<form onSubmit={uploadDocument} className="soft-panel grid content-start gap-3 p-5">
<h2 className="text-xl font-black text-legacy-ink">Upload document</h2>
<select name="clientId" className="rounded-lg border border-legacy-silver px-3 py-3" defaultValue="">
<option value="" disabled>Choose a client…</option>
<option value="__ALL__">All clients (bulk upload)</option>
{allClients.map((client) => (
<option key={client.id} value={client.id}>{client.name}</option>
))}
</select>
<input name="name" className="rounded-lg border border-legacy-silver px-3 py-3" placeholder="Document name" required />
<select name="category" className="rounded-lg border border-legacy-silver px-3 py-3" defaultValue={UPLOAD_CATEGORIES[0]}>
{UPLOAD_CATEGORIES.map((category) => (
<option key={category}>{category}</option>
))}
</select>
<input name="taxYear" type="number" className="rounded-lg border border-legacy-silver px-3 py-3" placeholder="Tax year (optional, e.g. 2023)" />
<select name="serviceSlug" className="rounded-lg border border-legacy-silver px-3 py-3" defaultValue="">
<option value="">General (no specific service)</option>
{allServices.map((service) => (
<option key={service.id} value={service.slug}>{service.name}</option>
))}
</select>
<label className="grid gap-3 rounded-2xl border border-dashed border-legacy-purple bg-legacy-lavender/60 p-5 text-center font-bold text-legacy-plum">
<Upload className="mx-auto" size={28} />
Select a file
<input name="file" type="file" className="sr-only" required />
</label>
<textarea name="internalNotes" className="rounded-lg border border-legacy-silver px-3 py-3" rows={3} placeholder="Internal notes (not visible to client)" />
<label className="flex items-center gap-2 text-sm font-bold text-legacy-ink">
<input name="visibleToClient" type="checkbox" defaultChecked className="h-4 w-4" />
Visible to client
</label>
<label className="flex items-center gap-2 text-sm font-bold text-legacy-ink">
<input name="notifyClient" type="checkbox" className="h-4 w-4" />
Notify client (portal notification)
</label>
<button disabled={uploading} className="rounded-lg bg-legacy-purple px-5 py-3 font-black text-white disabled:opacity-50">
{uploading ? "Uploading..." : "Upload document"}
</button>
{uploadError ? <p className="rounded-lg bg-legacy-lavender p-3 text-sm text-legacy-plum">{uploadError}</p> : null}
{uploadNotice ? <p className="rounded-lg border border-legacy-silver bg-white p-3 text-sm text-legacy-green">{uploadNotice}</p> : null}
</form>

<div className="soft-panel p-5">
<div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
<h2 className="text-xl font-black text-legacy-ink">All documents</h2>
<div className="flex flex-wrap gap-2">
<select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className="rounded-lg border border-legacy-silver px-3 py-2 text-sm">
<option value="All">All clients</option>
{allClients.map((client) => (
<option key={client.id} value={client.id}>{client.name}</option>
))}
</select>
<select value={filterService} onChange={(e) => setFilterService(e.target.value)} className="rounded-lg border border-legacy-silver px-3 py-2 text-sm">
<option value="All">All services</option>
<option value="General">General</option>
{allServices.map((service) => (
<option key={service.id} value={service.slug}>{service.name}</option>
))}
</select>
<select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="rounded-lg border border-legacy-silver px-3 py-2 text-sm">
<option value="All">All categories</option>
{ADMIN_DOCUMENT_CATEGORIES.map((category) => (
<option key={category}>{category}</option>
))}
</select>
<select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg border border-legacy-silver px-3 py-2 text-sm">
<option value="All">All statuses</option>
{ADMIN_DOCUMENT_STATUSES.map((status) => (
<option key={status}>{status}</option>
))}
</select>
<input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="rounded-lg border border-legacy-silver px-3 py-2 text-sm" />
</div>
</div>

<div className="grid gap-3">
{loading && <p className="text-sm text-legacy-muted">Loading documents...</p>}
{!loading && filteredDocs.length === 0 && (
<p className="text-sm text-legacy-muted">No documents match these filters yet.</p>
)}
{filteredDocs.map((doc: any) => (
<div key={doc.id} className="rounded-xl border border-legacy-silver p-4">
<div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
<div className="min-w-0 flex-1">
{editingId === doc.id ? (
<div className="flex flex-wrap items-center gap-2">
<input
value={editName}
onChange={(e) => setEditName(e.target.value)}
className="rounded-lg border border-legacy-silver px-3 py-2 text-sm"
/>
<button onClick={() => saveRename(doc)} className="rounded-lg bg-legacy-purple px-3 py-2 text-sm font-bold text-white">Save</button>
<button onClick={() => setEditingId(null)} className="rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-ink">Cancel</button>
</div>
) : (
<p className="font-black text-legacy-ink">{doc.name}</p>
)}
<p className="mt-1 text-sm text-legacy-muted">
{doc.clients?.profiles?.full_name || "Unknown client"} • {doc.category} • Uploaded {new Date(doc.created_at).toLocaleDateString()} •{" "}
<span className={doc.status === "Archived" ? "text-legacy-plum" : "text-legacy-green"}>{doc.status}</span>
</p>
<div className="mt-3 flex flex-wrap items-center gap-2">
<select
value={doc.folder || "Resources"}
onChange={(e) => moveFolder(doc, e.target.value)}
disabled={busyId === doc.id}
className="rounded-lg border border-legacy-silver px-2 py-2 text-sm"
>
{VAULT_FOLDERS.map((folder) => (
<option key={folder} value={folder}>{folder}</option>
))}
</select>
<span className="text-xs font-bold text-legacy-muted">
{doc.visible_to_client ? "Visible to client" : "Hidden from client"}
</span>
</div>
<div className="mt-3">
<textarea
value={notesDraft[doc.id] !== undefined ? notesDraft[doc.id] : (doc.internal_notes || "")}
onChange={(e) => setNotesDraft((prev) => ({ ...prev, [doc.id]: e.target.value }))}
onBlur={() => saveNotes(doc)}
rows={2}
placeholder="Internal notes (not visible to client)"
className="w-full rounded-lg border border-legacy-silver px-3 py-2 text-sm"
/>
</div>
</div>
<div className="flex shrink-0 flex-wrap gap-2">
{doc.storage_path ? (
<button onClick={() => viewDocument(doc.storage_path)} className="rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-ink">View</button>
) : null}
{editingId !== doc.id ? (
<button onClick={() => startRename(doc)} className="rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-ink">Rename</button>
) : null}
<button
onClick={() => archiveDocument(doc)}
disabled={busyId === doc.id}
className="rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-ink disabled:opacity-50"
>
{doc.status === "Archived" ? "Restore" : "Archive"}
</button>
<button
onClick={() => deleteDocument(doc)}
disabled={busyId === doc.id}
className="inline-flex items-center gap-1 rounded-lg border border-legacy-silver px-3 py-2 text-sm font-bold text-legacy-plum disabled:opacity-50"
>
<Trash2 size={14} /> Delete
</button>
</div>
</div>
</div>
))}
</div>
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
  const [clientsList, setClientsList] = useState<{ id: string; name: string }[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [thread, setThread] = useState<{ id: string; body: string; sender_id: string; created_at: string }[]>([]);
  const [messageText, setMessageText] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const supabase = supabaseBrowser();
    if (!supabase) return;
    let active = true;
    async function load() {
      if (!supabase) return;
      const { data: userData } = await supabase.auth.getUser();
      if (active) setUserId(userData.user?.id || null);
      const { data } = await supabase
        .from("clients")
        .select("id, profiles(full_name)")
        .order("created_at", { ascending: true });
      const rows = (data || []) as any[];
      const mapped = rows.map((row) => ({
        id: row.id,
        name: row.profiles?.full_name || "Unnamed client"
      }));
      if (active) {
        setClientsList(mapped);
        setSelectedClient((current) => current || (mapped[0] ? mapped[0].id : ""));
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedClient) {
      setThread([]);
      return;
    }
    const supabase = supabaseBrowser();
    if (!supabase) return;
    let active = true;
    async function loadThread() {
      if (!supabase) return;
      const { data } = await supabase
        .from("messages")
        .select("id, body, sender_id, created_at")
        .eq("client_id", selectedClient)
        .order("created_at", { ascending: true });
      if (active) setThread(data || []);
    }
    loadThread();
    const channel = supabase
      .channel(`admin-messages-${selectedClient}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `client_id=eq.${selectedClient}` },
        () => loadThread()
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [selectedClient]);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClient || !messageText.trim() || !userId) return;
    const supabase = supabaseBrowser();
    if (!supabase) return;
    setSending(true);
    await supabase.from("messages").insert({
      client_id: selectedClient,
      sender_id: userId,
      body: messageText.trim()
    });
    setMessageText("");
    const { data } = await supabase
      .from("messages")
      .select("id, body, sender_id, created_at")
      .eq("client_id", selectedClient)
      .order("created_at", { ascending: true });
    setThread(data || []);
    setSending(false);
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Send messages"
        description="Send updates, document requests, and service notes to clients. Each client has their own private thread."
      />
      <section className="soft-panel grid gap-4 p-5">
        <select
          value={selectedClient}
          onChange={(event) => setSelectedClient(event.target.value)}
          className="rounded-lg border border-legacy-silver px-3 py-3"
        >
          {clientsList.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>

        <div className="flex h-80 flex-col gap-3 overflow-auto rounded-lg border border-legacy-silver p-4">
          {thread.length === 0 && <p className="text-sm text-legacy-muted">No messages with this client yet.</p>}
          {thread.map((message) => (
            <div
              key={message.id}
              className={`max-w-[82%] rounded-2xl p-3 ${
                message.sender_id === userId ? "ml-auto bg-legacy-purple text-white" : "bg-legacy-lavender text-legacy-ink"
              }`}
            >
              <p className="leading-6">{message.body}</p>
              <p className={`mt-1 text-xs font-bold ${message.sender_id === userId ? "text-white/70" : "text-legacy-muted"}`}>
                {new Date(message.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        <form onSubmit={sendMessage} className="grid gap-3">
          <textarea
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
            className="rounded-lg border border-legacy-silver px-3 py-3"
            rows={4}
            placeholder="Write a clear message..."
            required
          />
          <button
            disabled={sending}
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-legacy-purple px-5 py-3 font-black text-white disabled:opacity-50"
          >
            <Send size={18} /> Send message
          </button>
        </form>
      </section>
    </>
  );
}

function AdminScheduling() {
  const [clientsList, setClientsList] = useState<{ id: string; name: string }[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [appointmentsList, setAppointmentsList] = useState<any[]>([]);

  useEffect(() => {
    const supabase = supabaseBrowser();
    if (!supabase) return;
    let active = true;
    async function load() {
      if (!supabase) return;
      const { data } = await supabase.from("clients").select("id, profiles(full_name)");
      const rows = (data || []) as any[];
      const mapped = rows.map((row) => ({ id: row.id, name: row.profiles?.full_name || "Unnamed client" }));
      if (active) {
        setClientsList(mapped);
        setSelectedClient((current) => current || (mapped[0] ? mapped[0].id : ""));
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  async function loadAppointments() {
    const supabase = supabaseBrowser();
    if (!supabase) return;
    const { data } = await supabase
      .from("appointments")
      .select("id, title, starts_at, ends_at, status, meeting_url, client_id, clients(profiles(full_name))")
      .order("starts_at", { ascending: true });
    setAppointmentsList(data || []);
  }

  useEffect(() => {
    loadAppointments();
  }, []);

  async function createAppointment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClient || !title.trim() || !startsAt) return;
    const supabase = supabaseBrowser();
    if (!supabase) return;
    setSaving(true);
    await supabase.from("appointments").insert({
      client_id: selectedClient,
      title: title.trim(),
      starts_at: new Date(startsAt).toISOString(),
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      meeting_url: meetingUrl || null,
      status: "Upcoming"
    });
    setTitle("");
    setStartsAt("");
    setEndsAt("");
    setMeetingUrl("");
    setFeedback("Appointment scheduled.");
    setSaving(false);
    loadAppointments();
  }

  async function updateStatus(id: string, status: string) {
    const supabase = supabaseBrowser();
    if (!supabase) return;
    await supabase.from("appointments").update({ status }).eq("id", id);
    loadAppointments();
  }

  async function removeAppointment(id: string) {
    const supabase = supabaseBrowser();
    if (!supabase) return;
    await supabase.from("appointments").delete().eq("id", id);
    loadAppointments();
  }

  return (
    <>
      <PageHeader eyebrow="Admin" title="Scheduling" description="Create and manage client appointments." />
      <section className="grid gap-5 lg:grid-cols-[22rem_1fr]">
        <form onSubmit={createAppointment} className="soft-panel grid content-start gap-3 p-5">
          <h2 className="text-lg font-black text-legacy-ink">New appointment</h2>
          <select
            value={selectedClient}
            onChange={(event) => setSelectedClient(event.target.value)}
            className="rounded-lg border border-legacy-silver px-3 py-3"
          >
            {clientsList.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="rounded-lg border border-legacy-silver px-3 py-3"
            placeholder="Appointment title"
            required
          />
          <label className="text-xs font-bold text-legacy-muted">Start</label>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            className="rounded-lg border border-legacy-silver px-3 py-3"
            required
          />
          <label className="text-xs font-bold text-legacy-muted">End (optional)</label>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            className="rounded-lg border border-legacy-silver px-3 py-3"
          />
          <input
            value={meetingUrl}
            onChange={(event) => setMeetingUrl(event.target.value)}
            className="rounded-lg border border-legacy-silver px-3 py-3"
            placeholder="Meeting link (optional)"
          />
          <button
            disabled={saving}
            className="rounded-lg bg-legacy-purple px-5 py-3 font-black text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Schedule appointment"}
          </button>
          {feedback && <p className="text-xs text-legacy-muted">{feedback}</p>}
        </form>

        <div className="soft-panel p-5">
          <h2 className="mb-3 text-lg font-black text-legacy-ink">Upcoming and past appointments</h2>
          <div className="grid gap-3">
            {appointmentsList.length === 0 && <p className="text-sm text-legacy-muted">No appointments scheduled yet.</p>}
            {appointmentsList.map((appt) => (
              <div key={appt.id} className="rounded-xl border border-legacy-silver p-4">
                <p className="font-black text-legacy-ink">{appt.title}</p>
                <p className="text-sm text-legacy-muted">{appt.clients?.profiles?.full_name}</p>
                <p className="text-sm text-legacy-muted">{new Date(appt.starts_at).toLocaleString()}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-legacy-lavender px-3 py-1 text-xs font-bold text-legacy-plum">
                    {appt.status}
                  </span>
                  <select
                    value={appt.status}
                    onChange={(event) => updateStatus(appt.id, event.target.value)}
                    className="rounded-lg border border-legacy-silver px-2 py-1 text-xs"
                  >
                    <option>Upcoming</option>
                    <option>Completed</option>
                    <option>Cancelled</option>
                  </select>
                  <button onClick={() => removeAppointment(appt.id)} className="text-xs font-bold text-red-600 underline">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
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
