import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyConnectSignature, downloadSignedDocument, downloadCertificate } from "@/lib/docusign";
import { notifyClientByEmail } from "@/lib/email";

export const runtime = "nodejs";
// DocuSign Connect webhook handler. Verifies the HMAC-SHA256 signature,
// dedupes redelivered events, and updates signing status, timeline,
// notifications, and email based on the event type.
export async function POST(request: Request) {
    const admin = supabaseAdmin();
    if (!admin) {
          return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

  const rawBody = await request.text();
    const signatureHeader = request.headers.get("x-docusign-signature-1");

  if (!verifyConnectSignature(rawBody, signatureHeader)) {
        return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  let payload: any;
    try {
          payload = JSON.parse(rawBody);
    } catch {
          return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

  const event: string = payload.event || "unknown";
    const data = payload.data || {};
    const envelopeId: string | undefined = data.envelopeId;
    const envelopeSummary = data.envelopeSummary || {};

  if (!envelopeId) {
        return NextResponse.json({ received: true, ignored: true });
  }

  const dedupeKey = `${envelopeId}:${event}:${envelopeSummary.statusChangedDateTime || payload.generatedDateTime || ""}`;

  const existingEvent = await admin
      .from("signature_events")
      .select("id")
      .eq("dedupe_key", dedupeKey)
      .maybeSingle();
    if (existingEvent.data) {
          return NextResponse.json({ received: true, duplicate: true });
    }

  const signatureRequestResult = await admin
      .from("signature_requests")
      .select("id, client_id, status")
      .eq("envelope_id", envelopeId)
      .maybeSingle();
    const signatureRequest = signatureRequestResult.data;

  await admin.from("signature_events").insert({
        signature_request_id: signatureRequest?.id || null,
        envelope_id: envelopeId,
        event_type: event,
        dedupe_key: dedupeKey,
        event_data: payload
  });

  if (!signatureRequest) {
        return NextResponse.json({ received: true, unmatched: true });
  }

  const requestId = signatureRequest.id;
    const clientId = signatureRequest.client_id;

  if (event === "envelope-delivered" || event === "recipient-delivered") {
        await admin
          .from("signature_requests")
          .update({ status: "viewed", viewed_at: new Date().toISOString() })
          .eq("id", requestId);
  }

  if (event === "envelope-declined" || event === "recipient-declined") {
        const reason = envelopeSummary.declinedReason || "Declined by signer.";
        await admin
          .from("signature_requests")
          .update({ status: "declined", declined_at: new Date().toISOString(), decline_reason: reason })
          .eq("id", requestId);
        await admin.from("documents").update({ status: "Needs update" }).eq("signature_request_id", requestId);
        await admin.from("client_timeline").insert({
                client_id: clientId,
                event_type: "signature_declined",
                title: "Agreement declined",
                description: reason,
                metadata: { signature_request_id: requestId }
        });
        await admin.from("notifications").insert({
                client_id: clientId,
                title: "Agreement declined",
                body: "A signature request was declined and needs attention.",
                kind: "signature_declined"
        });
  }

  if (event === "envelope-voided") {
        const reason = envelopeSummary.voidedReason || "Voided.";
        await admin
          .from("signature_requests")
          .update({ status: "voided", voided_at: new Date().toISOString(), void_reason: reason })
          .eq("id", requestId);
        await admin.from("documents").update({ status: "Needs update" }).eq("signature_request_id", requestId);
  }

  if (event === "envelope-completed" && signatureRequest.status !== "signed") {
        const [signedDoc, certificate] = await Promise.all([
                downloadSignedDocument(envelopeId),
                downloadCertificate(envelopeId)
              ]);

      let signedDocumentPath: string | null = null;
        let auditTrailPath: string | null = null;

      if (signedDoc) {
              signedDocumentPath = `${clientId}/${requestId}/signed-agreement.pdf`;
              await admin.storage
                .from("SIGNED DOCUMENTS")
                .upload(signedDocumentPath, Buffer.from(signedDoc), { contentType: "application/pdf", upsert: true });
      }
        if (certificate) {
                auditTrailPath = `${clientId}/${requestId}/certificate-of-completion.pdf`;
                await admin.storage
                  .from("SIGNED DOCUMENTS")
                  .upload(auditTrailPath, Buffer.from(certificate), { contentType: "application/pdf", upsert: true });
        }

      await admin
          .from("signature_requests")
          .update({
                    status: "signed",
                    signed_at: new Date().toISOString(),
                    signed_document_path: signedDocumentPath,
                    audit_trail_path: auditTrailPath
          })
          .eq("id", requestId);

      await admin
          .from("documents")
          .update({ status: "Signed", storage_path: signedDocumentPath })
          .eq("signature_request_id", requestId);

      const docNameResult = await admin
          .from("signature_requests")
          .select("master_documents(name)")
          .eq("id", requestId)
          .single();
        const docName = (docNameResult.data as any)?.master_documents?.name || "your agreement";

      await admin.from("client_timeline").insert({
              client_id: clientId,
              event_type: "signature_completed",
              title: `Signed: ${docName}`,
              description: "Your electronic signature was completed.",
              metadata: { signature_request_id: requestId }
      });

      await admin.from("notifications").insert({
              client_id: clientId,
              title: "Agreement signed",
              body: `Your signed agreement (${docName}) is now available in your Document Vault.`,
              kind: "signature_completed"
      });

      await notifyClientByEmail(clientId, "SIGNATURE_COMPLETED", { label: docName });
  }

  return NextResponse.json({ received: true });
}
