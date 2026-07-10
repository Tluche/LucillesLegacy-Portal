import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createRecipientView } from "@/lib/docusign";

export const runtime = "nodejs";
// Generates a fresh, one-time embedded signing URL for a signature request.
// The caller must be the owning client (self-service "Review & Sign") or an
// admin. Requires that the client has already consented to electronic
// records and signatures (consent must be recorded first via the same
// request body, or on a prior call).
export async function POST(request: Request) {
    const body = await request.json().catch(() => ({}));
    const signatureRequestId = body.signatureRequestId;
    const consent = body.consent === true;
    const returnUrl = typeof body.returnUrl === "string" ? body.returnUrl : null;

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
    const isAdmin = callerProfileResult.data?.role === "admin";

  const signatureRequestResult = await admin
      .from("signature_requests")
      .select("id, client_id, envelope_id, status, signer_name, signer_email, consent_at")
      .eq("id", signatureRequestId)
      .single();
    const signatureRequest = signatureRequestResult.data;
    if (!signatureRequest) {
          return NextResponse.json({ error: "Signature request not found." }, { status: 404 });
    }

  if (!isAdmin) {
        const ownerResult = await admin
          .from("clients")
          .select("id")
          .eq("id", signatureRequest.client_id)
          .eq("profile_id", user.id)
          .maybeSingle();
        if (!ownerResult.data) {
                return NextResponse.json({ error: "Not authorized for this signature request." }, { status: 403 });
        }
  }

  if (!signatureRequest.envelope_id) {
        return NextResponse.json({ error: "This agreement is not ready to sign yet." }, { status: 400 });
  }

  if (["signed", "completed", "voided", "declined", "expired"].includes(signatureRequest.status)) {
        return NextResponse.json({ error: `This agreement is already ${signatureRequest.status}.` }, { status: 400 });
  }

  if (!signatureRequest.consent_at) {
        if (!consent) {
                return NextResponse.json({ error: "Electronic signature consent is required.", requiresConsent: true }, { status: 400 });
        }
        await admin
          .from("signature_requests")
          .update({ consent_at: new Date().toISOString() })
          .eq("id", signatureRequest.id);
  }

  const defaultReturnUrl = "https://portal.lucilleslegacy.net/portal?section=documents&signing=" + signatureRequest.id;

  const viewResult = await createRecipientView({
        envelopeId: signatureRequest.envelope_id,
        signerName: signatureRequest.signer_name,
        signerEmail: signatureRequest.signer_email,
        clientUserId: signatureRequest.id,
        returnUrl: returnUrl || defaultReturnUrl
  });

  if (!viewResult.ok) {
        return NextResponse.json({ error: viewResult.error || "Failed to create the signing session." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, url: viewResult.url });
}
