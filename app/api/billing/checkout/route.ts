import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripeServer } from "@/lib/stripe";

export async function POST(request: Request) {
  const body = await request.json();
  const invoiceIds: string[] = Array.isArray(body.invoiceIds)
    ? body.invoiceIds
    : body.invoiceId
    ? [body.invoiceId]
    : [];

  if (invoiceIds.length === 0) {
    return NextResponse.json({ error: "No invoice selected." }, { status: 400 });
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

  const clientResult = await supabase
    .from("clients")
    .select("id, stripe_customer_id, profiles(full_name, email)")
    .eq("profile_id", user.id)
    .single();
  const client: any = clientResult.data;
  if (!client) {
    return NextResponse.json({ error: "No client record found for this account." }, { status: 404 });
  }

  const admin = supabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
  }

  const invoicesResult = await admin
    .from("invoices")
    .select("id, label, service, amount_cents, amount_paid_cents, status, client_id")
    .in("id", invoiceIds)
    .eq("client_id", client.id);

  const invoices: any[] = invoicesResult.data || [];
  if (invoices.length === 0) {
    return NextResponse.json({ error: "No matching invoices found." }, { status: 404 });
  }

  const payable = invoices.filter(
    (invoice) => invoice.status !== "Paid" && invoice.status !== "Cancelled" && invoice.status !== "Refunded"
  );
  if (payable.length === 0) {
    return NextResponse.json({ error: "These invoices are already paid or closed." }, { status: 400 });
  }

  const stripe = stripeServer();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured yet." }, { status: 500 });
  }

  let stripeCustomerId: string | null = client.stripe_customer_id;
  if (!stripeCustomerId) {
    const profile: any = client.profiles;
    const customer = await stripe.customers.create({
      email: profile?.email || user.email || undefined,
      name: profile?.full_name || undefined,
      metadata: { client_id: client.id }
    });
    stripeCustomerId = customer.id;
    await admin.from("clients").update({ stripe_customer_id: stripeCustomerId }).eq("id", client.id);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const invoiceIdList = payable.map((invoice) => invoice.id).join(",");

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: stripeCustomerId,
    line_items: payable.map((invoice) => ({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: Math.max(invoice.amount_cents - invoice.amount_paid_cents, 0),
        product_data: {
          name: invoice.service ? `${invoice.service} - ${invoice.label}` : invoice.label
        }
      }
    })),
    payment_intent_data: {
      metadata: {
        client_id: client.id,
        invoice_ids: invoiceIdList
      }
    },
    metadata: {
      client_id: client.id,
      invoice_ids: invoiceIdList
    },
    success_url: `${siteUrl}/portal?billingResult=success`,
    cancel_url: `${siteUrl}/portal?billingResult=cancelled`
  });

  return NextResponse.json({ url: session.url });
}
