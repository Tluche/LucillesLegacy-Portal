import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildEnvelopeDocument, createEnvelope } from "@/lib/docusign";
import { notifyClientByEmail } from "@/lib/email";

export const runtime = "nodejs";
// Creates a signature_requests row and immediately sends the DocuSign
// envelope for a "documents" vault row that links to a signature-required
// master document. Callers must be an admin, or the owning client (covers
// both manual admin assignment and any future self-service triggers).
export async function POST(request: Request) {
    const body = await request.json().catch(() => ({}));
    const documentId = body.documentId;
    if (!documentId) {
          return NextResponse.json({ error: "Missing documentId." }, { status: 400 });
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

  const documentResult = await admin
      .from("documents")
      .select("id, client_id, master_document_id, signature_request_id")
      .eq("id", documentId)
      .single();
    const document = documentResult.data;
    if (!document) {
          return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

  if (!isAdmin) {
        const ownerResult = await admin
          .from("clients")
          .select("id")
          .eq("id", document.client_id)
          .eq("profile_id", user.id)
          .maybeSingle();
        if (!ownerResult.data) {
                return NextResponse.json({ error: "Not authorized for this document." }, { status: 403 });
        }
  }

  if (document.signature_request_id) {
        return NextResponse.json({ ok: true, alreadyExists: true, signatureRequestId: document.signature_request_id });
  }

  if (!document.master_document_id) {
        return NextResponse.json({ error: "This document has no signature template linked." }, { status: 400 });
  }

  const masterDocResult = await admin
      .from("master_documents")
      .select("id, name, document_type, storage_path, version, signature_fields")
      .eq("id", document.master_document_id)
      .single();
    const masterDoc = masterDocResult.data;
    if (!masterDoc || masterDoc.document_type !== "signature_required") {
          return NextResponse.json({ error: "This document does not require a signature." }, { status: 400 });
    }

  const clientResult = await admin
      .from("clients")
      .select("id, profiles(full_name, email)")
      .eq("id", document.client_id)
      .single();
    const clientProfile: any = clientResult.data?.profiles;
    if (!clientProfile?.email) {
          return NextResponse.json({ error: "No email on file for this client." }, { status: 400 });
    }

  const signatureRequestInsert = await admin
      .from("signature_requests")
      .insert({
              client_id: document.client_id,
              master_document_id: masterDoc.id,
              document_version: masterDoc.version,
              provider: "docusign",
              signer_name: clientProfile.full_name,
              signer_email: clientProfile.email,
              status: "creating",
              created_by: user.id
      })
      .select()
      .single();

  if (signatureRequestInsert.error || !signatureRequestInsert.data) {
        return NextResponse.json(
          { error: signatureRequestInsert.error?.message || "Failed to create the signature request." },
          { status: 500 }
              );
  }
    const signatureRequest = signatureRequestInsert.data;

  const doc = await buildEnvelopeDocument(
    { name: masterDoc.name, storage_path: masterDoc.storage_path },
        async (path: string) => {
                const downloadResult = await admin.storage.from("MASTER DOCUMENTS").download(path);
                if (!downloadResult.data) return null;
                return downloadResult.data.arrayBuffer();
        }
      );

  const envelopeResult = await createEnvelope({
        document: doc,
        signatureFields: Array.isArray(masterDoc.signature_fields) ? masterDoc.signature_fields : null,
        signerName: clientProfile.full_name,
        signerEmail: clientProfile.email,
        clientUserId: signatureRequest.id
  });

  if (!envelopeResult.ok) {
        await admin.from("signature_requests").update({ status: "error" }).eq("id", signatureRequest.id);
        return NextResponse.json({ error: envelopeResult.error || "Failed to send the envelope." }, { status: 502 });
  }

  await admin
      .from("signature_requests")
      .update({ status: "sent", envelope_id: envelopeResult.envelopeId, sent_at: new Date().toISOString() })
      .eq("id", signatureRequest.id);

  await admin
      .from("documents")
      .update({ status: "Signature Required", signature_request_id: signatureRequest.id, requires_signature: true })
      .eq("id", document.id);

  await admin.from("client_timeline").insert({
        client_id: document.client_id,
        event_type: "signature_requested",
        title: `Signature requested: ${masterDoc.name}`,
        description: "An agreement was sent for your electronic signature.",
        metadata: { master_document_id: masterDoc.id, signature_request_id: signatureRequest.id }
  });

  await admin.from("notifications").insert({
        client_id: document.client_id,
        title: "Signature requested",
        body: `Please review and sign: ${masterDoc.name}`,
        kind: "signature_requested"
  });

  await notifyClientByEmail(document.client_id, "SIGNATURE_READY", { label: masterDoc.name });

  return NextResponse.json({ ok: true, signatureRequestId: signatureRequest.id, envelopeId: envelopeResult.envelopeId });
}
