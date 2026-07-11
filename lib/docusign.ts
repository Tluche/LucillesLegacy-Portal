import crypto from "crypto";

// DocuSign JWT Grant + eSignature REST API integration for embedded signing.
// Provider-agnostic naming is intentionally avoided here (unlike lib/email.ts)
// because DocuSign was explicitly selected as the e-signature provider. The
// RSA private key and integration key are only ever read from server-side
// environment variables and never sent to the browser.

const DOCUSIGN_AUTH_HOST = process.env.DOCUSIGN_AUTH_HOST || "account-d.docusign.com";

type TokenCache = { accessToken: string; expiresAt: number };
let cachedToken: TokenCache | null = null;

function base64url(input: Buffer | string): string {
    const buf = typeof input === "string" ? Buffer.from(input) : input;
    return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildJwtAssertion(): string {
    const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
    const userId = process.env.DOCUSIGN_USER_ID;
    const privateKey = process.env.DOCUSIGN_RSA_PRIVATE_KEY;
    if (!integrationKey || !userId || !privateKey) {
          throw new Error("DocuSign is not configured.");
    }
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "RS256", typ: "JWT" };
    const payload = {
          iss: integrationKey,
          sub: userId,
          aud: DOCUSIGN_AUTH_HOST,
          iat: now,
          exp: now + 3600,
          scope: "signature impersonation"
    };
    const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(signingInput);
    signer.end();
    const signature = signer.sign(privateKey.replace(/\\n/g, "\n"));
    return `${signingInput}.${base64url(signature)}`;
}

// Returns a cached JWT access token, requesting a new one from DocuSign only
// when the cached token is missing or close to expiry.
export async function getAccessToken(): Promise<string | null> {
    if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
          return cachedToken.accessToken;
    }
    try {
          const assertion = buildJwtAssertion();
          const response = await fetch(`https://${DOCUSIGN_AUTH_HOST}/oauth/token`, {
                  method: "POST",
                  headers: { "Content-Type": "application/x-www-form-urlencoded" },
                  body: new URLSearchParams({
                            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
                            assertion
                  })
          });
          if (!response.ok) {
                  const text = await response.text().catch(() => "");
                  console.error("DocuSign token error:", response.status, text);
                  return null;
          }
          const data: any = await response.json();
          cachedToken = { accessToken: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
          return cachedToken.accessToken;
    } catch (error: any) {
          console.error("DocuSign token exception:", error?.message || error);
          return null;
    }
}

function apiBase(): string | null {
    const baseUri = process.env.DOCUSIGN_BASE_URI;
    const accountId = process.env.DOCUSIGN_API_ACCOUNT_ID;
    if (!baseUri || !accountId) return null;
    return `${baseUri}/restapi/v2.1/accounts/${accountId}`;
}

type DocusignResult = { ok: boolean; status: number; data: any; error: string | null };

async function docusignFetch(path: string, options: RequestInit = {}): Promise<DocusignResult> {
    const token = await getAccessToken();
    const base = apiBase();
    if (!token || !base) {
          return { ok: false, status: 500, data: null, error: "DocuSign is not configured." };
    }
    const response = await fetch(`${base}${path}`, {
          ...options,
          headers: {
                  ...(options.headers || {}),
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json"
          }
    });
    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const data = isJson ? await response.json().catch(() => null) : null;
    if (!response.ok) {
          return { ok: false, status: response.status, data, error: isJson ? JSON.stringify(data) : `DocuSign request failed (${response.status}).` };
    }
    return { ok: true, status: response.status, data, error: null };
}

// Downloads the master document's source file (if one has been uploaded to
// the MASTER DOCUMENTS bucket) and returns it base64-encoded for the
// envelope. Falls back to a clearly-labeled generated sample agreement when
// no source file exists yet, so the signing framework can be built and
// tested before real templates are uploaded (per the testing-phase rule).
export async function buildEnvelopeDocument(
    masterDoc: { name: string; storage_path: string | null },
    downloadMasterFile: (path: string) => Promise<ArrayBuffer | null>
  ): Promise<{ documentBase64: string; fileExtension: string; name: string }> {
    if (masterDoc.storage_path) {
          const fileBuffer = await downloadMasterFile(masterDoc.storage_path);
          if (fileBuffer) {
                  const fileExtension = masterDoc.storage_path.split(".").pop() || "pdf";
                  return {
                            documentBase64: Buffer.from(fileBuffer).toString("base64"),
                            fileExtension,
                            name: masterDoc.name
                  };
          }
    }

  const html = `<html><body style="font-family: Helvetica, Arial, sans-serif; padding: 48px;">
      <h2 style="color:#5b3a8e;">SAMPLE DOCUMENT &mdash; FOR TESTING ONLY</h2>
          <p><strong>${masterDoc.name}</strong></p>
              <p>This is a clearly-labeled placeholder agreement used to build and test the
                  electronic signature workflow for Lucille's Legacy Client Portal. It is not a
                      real, binding agreement. Real agreements will be configured in a later phase.</p>
                          <br /><br />
                              <p>Signer signature: /sn1/</p>
                                  <p>Date signed: /d1/</p>
                                    </body></html>`;

  return {
        documentBase64: Buffer.from(html).toString("base64"),
        fileExtension: "html",
        name: masterDoc.name
  };
}

type SignatureFieldConfig = { type?: string; anchorString?: string; page?: number };

// Creates and immediately sends an embedded-signing envelope. clientUserId
// must be a stable, non-empty identifier for the signer (we use the
// signature_requests row id) so DocuSign treats this as an embedded
// (captive) recipient rather than a remote email-based signer.
export async function createEnvelope(params: {
    document: { documentBase64: string; fileExtension: string; name: string };
    signatureFields: SignatureFieldConfig[] | null;
    signerName: string;
    signerEmail: string;
    clientUserId: string;
}): Promise<{ ok: boolean; envelopeId?: string; error?: string }> {
    const configuredSignTabs = (params.signatureFields || []).filter((f) => f.type === "sign" || !f.type);
    const signHereTabs = (configuredSignTabs.length > 0 ? configuredSignTabs : [{ anchorString: "/sn1/" }]).map((f) => ({
          anchorString: f.anchorString || "/sn1/",
          anchorUnits: "pixels",
          anchorXOffset: "0",
          anchorYOffset: "0"
    }));

  const configuredDateTabs = (params.signatureFields || []).filter((f) => f.type === "date");
    const dateSignedTabs = (configuredDateTabs.length > 0 ? configuredDateTabs : [{ anchorString: "/d1/" }]).map((f) => ({
          anchorString: f.anchorString || "/d1/",
          anchorUnits: "pixels",
          anchorXOffset: "0",
          anchorYOffset: "0"
    }));

  const envelopeDefinition = {
        emailSubject: `Please sign: ${params.document.name}`,
        documents: [
          {
                    documentBase64: params.document.documentBase64,
                    name: params.document.name,
                    fileExtension: params.document.fileExtension,
                    documentId: "1"
          }
              ],
        recipients: {
                signers: [
                  {
                              email: params.signerEmail,
                              name: params.signerName,
                              recipientId: "1",
                              clientUserId: params.clientUserId,
                              tabs: { signHereTabs, dateSignedTabs }
                  }
                        ]
        },
        status: "sent",
      eventNotification: {
          url: (process.env.NEXT_PUBLIC_SITE_URL || "https://portal.lucilleslegacy.net") + "/api/signatures/webhook",
          loggingEnabled: "true",
          requireAcknowledgment: "true",
          includeDocuments: "false",
          includeCertificateOfCompletion: "false",
          includeEnvelopeVoidReason: "true",
          includeTimeZone: "true",
          envelopeEventStatusCode: [
              { envelopeEventStatusCode: "completed" },
              { envelopeEventStatusCode: "declined" },
              { envelopeEventStatusCode: "voided" }
              ],
          recipientEvents: [
              { recipientEventStatusCode: "Completed" },
              { recipientEventStatusCode: "Declined" },
              { recipientEventStatusCode: "AutoResponded" }
              ]
      }
  };

  const result = await docusignFetch("/envelopes", { method: "POST", body: JSON.stringify(envelopeDefinition) });
    if (!result.ok) {
          return { ok: false, error: result.error || "Failed to create the DocuSign envelope." };
    }
    return { ok: true, envelopeId: (result.data as any)?.envelopeId };
}

// Generates a one-time embedded signing (Recipient View) URL. This must be
// requested fresh each time the client clicks "Review & Sign" - DocuSign
// signing URLs are short-lived and single-use.
export async function createRecipientView(params: {
    envelopeId: string;
    signerName: string;
    signerEmail: string;
    clientUserId: string;
    returnUrl: string;
}): Promise<{ ok: boolean; url?: string; error?: string }> {
    const result = await docusignFetch(`/envelopes/${params.envelopeId}/views/recipient`, {
          method: "POST",
          body: JSON.stringify({
                  returnUrl: params.returnUrl,
                  authenticationMethod: "none",
                  email: params.signerEmail,
                  userName: params.signerName,
                  clientUserId: params.clientUserId
          })
    });
    if (!result.ok) return { ok: false, error: result.error || "Failed to create the signing session." };
    return { ok: true, url: (result.data as any)?.url };
}

export async function voidEnvelope(envelopeId: string, reason: string): Promise<DocusignResult> {
    return docusignFetch(`/envelopes/${envelopeId}`, {
          method: "PUT",
          body: JSON.stringify({ status: "voided", voidedReason: reason })
    });
}

// Resends notification emails to any recipient who has not yet completed.
export async function resendEnvelope(envelopeId: string): Promise<DocusignResult> {
    return docusignFetch(`/envelopes/${envelopeId}/recipients?resend_envelope=true`, {
          method: "PUT",
          body: JSON.stringify({})
    });
}

export async function getEnvelope(envelopeId: string): Promise<DocusignResult> {
    return docusignFetch(`/envelopes/${envelopeId}`);
}

async function downloadBinary(path: string): Promise<ArrayBuffer | null> {
    const token = await getAccessToken();
    const base = apiBase();
    if (!token || !base) return null;
    const response = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return null;
    return response.arrayBuffer();
}

export async function downloadSignedDocument(envelopeId: string): Promise<ArrayBuffer | null> {
    return downloadBinary(`/envelopes/${envelopeId}/documents/combined`);
}

export async function downloadCertificate(envelopeId: string): Promise<ArrayBuffer | null> {
    return downloadBinary(`/envelopes/${envelopeId}/documents/certificate`);
}

// Verifies a DocuSign Connect webhook's HMAC-SHA256 signature against the
// raw request body, per DocuSign's official Connect signing requirements.
export function verifyConnectSignature(rawBody: string, signatureHeader: string | null): boolean {
    const hmacKey = process.env.DOCUSIGN_CONNECT_HMAC_KEY;
    if (!hmacKey || !signatureHeader) return false;
    const computed = crypto.createHmac("sha256", hmacKey).update(rawBody, "utf8").digest("base64");
    try {
          return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signatureHeader));
    } catch {
          return false;
    }
}
