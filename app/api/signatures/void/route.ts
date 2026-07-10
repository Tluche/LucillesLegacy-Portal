import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { voidEnvelope } from "@/lib/docusign";

export const runtime = "nodejs";
// Admin-only: voids an in-progress signature request.
export async function POST(request: Request) {
    const body = await request.json().catch(() => ({}));
    const signatureRequestId = body.signatureRequestId;
    const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : "Voided by admin.";

  if (!signatureRequestId) {
        return NextResponse.json({ error: "Missing signatureRequestId." }, { status: 400 });
  }

  const supabase = supabaseServer();
    const admin = supabaseAdmin();
    if (!supabase || !admin) {
          return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

  const auth = await supabase.auth.getUser();
    const user = auth.data.user;
    if (!user) {
          return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

  const callerProfileResult = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (callerProfileResult.data?.role !== "admin") {
          return NextResponse.json({ error: "Only admins can void a signature request." }, { status: 403 });
    }

  const signatureRequestResult = await admin
      .from("signature_requests")
      .select("id, client_id, envelope_id, status")
      .eq("id", signatureRequestId)
      .single();
    const signatureRequest = signatureRequestResult.data;
    if (!signatureRequest) {
          return NextResponse.json({ error: "Signature request not found." }, { status: 404 });
    }
    if (!signatureRequest.envelope_id) {
          return NextResponse.json({ error: "This request has no envelope to void." }, { status: 400 });
    }
    if (["signed", "completed", "voided", "declined"].includes(signatureRequest.status)) {
          return NextResponse.json({ error: `This request is already ${signatureRequest.status}.` }, { status: 400 });
    }

  const voidResult = await voidEnvelope(signatureRequest.envelope_id, reason);
    if (!voidResult.ok) {
          return NextResponse.json({ error: voidResult.error || "Failed to void the envelope." }, { status: 502 });
    }

  await admin
      .from("signature_requests")
      .update({ status: "voided", voided_at: new Date().toISOString(), void_reason: reason })
      .eq("id", signatureRequestId);

  await admin
      .from("documents")
      .update({ status: "Needs update" })
      .eq("signature_request_id", signatureRequestId);

  await admin.from("client_timeline").insert({
        client_id: signatureRequest.client_id,
        event_type: "signature_voided",
        title: "Signature request voided",
        description: reason,
        metadata: { signature_request_id: signatureRequestId }
  });

  return NextResponse.json({ ok: true });
}
