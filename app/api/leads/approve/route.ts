import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function mapPreferredContact(value: string | null | undefined): "Email" | "Phone" | "Text" {
  if (!value) return "Email";
  const v = value.toLowerCase();
  if (v.includes("text")) return "Text";
  if (v.includes("phone") || v.includes("call")) return "Phone";
  return "Email";
}

function matchServiceSlug(serviceLabel: string): string | null {
  const v = serviceLabel.toLowerCase();
  if (v.includes("tax")) return "tax";
  if (v.includes("credit")) return "credit";
  if (v.includes("bookkeep")) return "bookkeeping";
  if (v.includes("insurance")) return "life-insurance";
  return null;
}

export async function POST(request: Request) {
  const body = await request.json();
  const leadId = body.leadId;

if (!leadId) {
  return NextResponse.json({ error: "Missing leadId." }, { status: 400 });
}

const supabase = supabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

const auth = await supabase.auth.getUser();
  const user = auth.data.user;

if (!user) {
  return NextResponse.json({ error: "Not signed in." }, { status: 401 });
}

const callerProfileResult = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const callerProfile = callerProfileResult.data;

if (!callerProfile || callerProfile.role !== "admin") {
  return NextResponse.json({ error: "Only admins can approve leads." }, { status: 403 });
}

const admin = supabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
  }

const leadResult = await admin.from("leads").select("*").eq("id", leadId).single();
  const lead = leadResult.data;

if (leadResult.error || !lead) {
  return NextResponse.json({ error: "Lead not found." }, { status: 404 });
}

if (lead.converted_profile_id) {
  return NextResponse.json({ error: "This lead has already been approved." }, { status: 400 });
}

const inviteResult = await admin.auth.admin.inviteUserByEmail(lead.email);

if (inviteResult.error || !inviteResult.data?.user) {
  const message = inviteResult.error ? inviteResult.error.message : "Could not invite this client.";
  return NextResponse.json({ error: message }, { status: 500 });
}

const newUserId = inviteResult.data.user.id;

const profileInsert = await admin.from("profiles").insert({
  id: newUserId,
  role: "client",
  full_name: lead.full_name,
  phone: lead.phone,
  email: lead.email,
  address: [lead.city, lead.state].filter(Boolean).join(", "),
  preferred_contact: mapPreferredContact(lead.preferred_contact_method)
});

if (profileInsert.error) {
  return NextResponse.json({ error: profileInsert.error.message }, { status: 500 });
}

const clientInsert = await admin.from("clients").insert({ profile_id: newUserId, status: "Active" }).select("id").single();

if (clientInsert.error || !clientInsert.data) {
  const message = clientInsert.error ? clientInsert.error.message : "Could not create client record.";
  return NextResponse.json({ error: message }, { status: 500 });
}

const newClientId = clientInsert.data.id;
  const requestedServices: string[] = Array.isArray(lead.services_needed) ? lead.services_needed : [];
  const slugSet = new Set<string>();
  requestedServices.forEach((label: string) => {
    const slug = matchServiceSlug(label);
    if (slug) slugSet.add(slug);
  });
  const slugs = Array.from(slugSet);

if (slugs.length > 0) {
  const servicesResult = await admin.from("services").select("id, slug, stages").in("slug", slugs);
  const services = servicesResult.data;
  if (services && services.length > 0) {
    const rows = services.map((service: any) => ({
      client_id: newClientId,
      service_id: service.id,
      current_stage: service.stages[0],
      progress: 0
    }));
    await admin.from("client_services").insert(rows);
  }
}

await admin.from("leads").update({ status: "Approved", converted_profile_id: newUserId }).eq("id", leadId);

return NextResponse.json({ success: true });
}
