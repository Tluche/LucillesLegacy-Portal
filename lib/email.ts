import { supabaseAdmin } from "@/lib/supabase/admin";

// Central email-sending abstraction for Lucille's Legacy Client Portal.
// Provider-agnostic on purpose: once Brevo domain auth is done, set
// BREVO_API_KEY, BREVO_SENDER_EMAIL, and BREVO_SENDER_NAME as environment
// variables and every trigger below starts sending automatically. No
// credentials or provider-specific code should ever live outside this file.

export type EmailTemplateKey =
  | "PORTAL_INVITATION"
| "PASSWORD_RESET"
| "INTAKE_RECEIVED"
| "INVOICE_READY"
| "PAYMENT_CONFIRMATION"
| "NEW_PORTAL_MESSAGE"
| "NEW_DOCUMENT"
| "DOCUMENT_REQUESTED"
| "STATUS_UPDATE"
| "SERVICE_APPROVAL"
| "SERVICE_COMPLETION";

type EmailPayload = {
  to: string;
  toName?: string | null;
  template: EmailTemplateKey;
  data?: Record<string, string | number | null | undefined>;
};

const TEMPLATE_COPY: Record<EmailTemplateKey, (data: Record<string, any>) => { subject: string; text: string }> = {
  PORTAL_INVITATION: () => ({
    subject: "You're invited to your Lucille's Legacy Client Portal",
    text: "Your client portal is ready. Use the invite link you received to set your password and sign in."
  }),
  PASSWORD_RESET: () => ({
    subject: "Reset your Lucille's Legacy Client Portal password",
    text: "Use the secure link you received to reset your portal password. If you did not request this, you can ignore this email."
  }),
  INTAKE_RECEIVED: () => ({
    subject: "We received your intake form",
    text: "Thanks for submitting your intake information. Tia will review it and follow up with next steps soon."
  }),
  INVOICE_READY: (data) => ({
    subject: "A new invoice is ready in your portal",
    text: "A new invoice" + (data?.label ? (" for " + data.label) : "") + " is ready to view. Log in to your client portal for details."
  }),
  PAYMENT_CONFIRMATION: (data) => ({
    subject: "Payment received - thank you!",
    text: "We received your payment" + (data?.label ? (" for " + data.label) : "") + ". Thank you! Log in to your client portal to view your receipt."
  }),
  NEW_PORTAL_MESSAGE: () => ({
    subject: "You have a new message in your client portal",
    text: "You have a new message waiting for you. Log in to your client portal to read and reply."
  }),
  NEW_DOCUMENT: () => ({
    subject: "A new document was added to your portal",
    text: "A new document was added to your Document Vault. Log in to your client portal to view it."
  }),
  DOCUMENT_REQUESTED: () => ({
    subject: "A document was requested",
    text: "Tia requested a document from you. Log in to your client portal to upload it."
  }),
  STATUS_UPDATE: (data) => ({
    subject: "Your status was updated",
    text: "Your status" + (data?.label ? (" for " + data.label) : "") + " was updated. Log in to your client portal for details."
  }),
  SERVICE_APPROVAL: (data) => ({
    subject: "Your service request was approved",
    text: "Your request" + (data?.service ? (" for " + data.service) : "") + " was approved. Log in to your client portal to see what's next."
  }),
  SERVICE_COMPLETION: (data) => ({
    subject: "A service was marked complete",
    text: "Your service" + (data?.service ? (" (" + data.service + ")") : "") + " was marked complete. Log in to your client portal for details."
  })
};

// Returns { sent: boolean, reason?: string }. Never throws - callers should
// treat email delivery as best-effort and should not block the underlying
// action (payment processing, document upload, etc.) if sending fails.
export async function sendTransactionalEmail(payload: EmailPayload): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "Lucille's Legacy";

if (!apiKey || !senderEmail) {
  return { sent: false, reason: "Brevo is not configured yet." };
}
  if (!payload.to) {
    return { sent: false, reason: "No recipient email address." };
  }

const copy = TEMPLATE_COPY[payload.template](payload.data || {});

try {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": apiKey
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: payload.to, name: payload.toName || undefined }],
      subject: copy.subject,
      textContent: copy.text
    })
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    return { sent: false, reason: "Brevo error: " + response.status + " " + errorText };
  }
  return { sent: true };
} catch (error: any) {
  return { sent: false, reason: error?.message || "Unknown email error." };
}
}

// Convenience helper: looks up a client's profile email/name via the admin
// Supabase client and sends a transactional email. Safe to call from any
// server-side route - failures are swallowed by sendTransactionalEmail.
export async function notifyClientByEmail(
  clientId: string,
  template: EmailTemplateKey,
  data?: Record<string, string | number | null | undefined>
  ): Promise<{ sent: boolean; reason?: string }> {
  const admin = supabaseAdmin();
  if (!admin) return { sent: false, reason: "Supabase admin client not configured." };
  const result = await admin.from("clients").select("profiles(full_name, email)").eq("id", clientId).single();
  const profile: any = result.data?.profiles;
  if (!profile?.email) return { sent: false, reason: "No email on file for this client." };
  return sendTransactionalEmail({ to: profile.email, toName: profile.full_name, template, data });
}
