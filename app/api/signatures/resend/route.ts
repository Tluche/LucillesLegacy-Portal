import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resendEnvelope } from "@/lib/docusign";

export const runtime = "nodejs";

// Admin-only: resends the DocuSign email notification for an in-progress
// signature request (does not create a new envelope).
export async function POST(request: Request) {
    const body = await request.json().catch(() => ({}));
    const signatureRequestId = body.signatureRequestId;
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
          return NextResponse.json({ error: "Only admins can resend a signature request." }, { status: 403 });
    }

  const signatureRequestResult = await admin
      .from("signature_requests")
      .select("id, envelope_id, status")
      .eq("id", signatureRequestId)
      .single();
    const signatureRequest = signatureRequestResult.data;
    if (!signatureRequest) {
          return NextResponse.json({ error: "Signature request not found." }, { status: 404 });
    }
    if (!signatureRequest.envelope_id) {
          return NextResponse.json({ error: "This request has no envelope to resend." }, { status: 400 });
    }
    if (["signed", "completed", "voided", "declined", "expired"].includes(signatureRequest.status)) {
          return NextResponse.json({ error: `This request is already ${signatureRequest.status}.` }, { status: 400 });
    }

  const resendResult = await resendEnvelope(signatureRequest.envelope_id);
    if (!resendResult.ok) {
          return NextResponse.json({ error: resendResult.error || "Failed to resend the envelope." }, { status: 502 });
    }

  return NextResponse.json({ ok: true });
}
