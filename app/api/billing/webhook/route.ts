import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripeServer } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripe = stripeServer();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const admin = supabaseAdmin();

  if (!stripe || !webhookSecret || !admin) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature || "", webhookSecret);
  } catch (error: any) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${error.message}` }, { status: 400 });
  }

  const existing = await admin.from("billing_events").select("id").eq("stripe_event_id", event.id).maybeSingle();
  if (existing.data) {
    return NextResponse.json({ received: true, duplicate: true });
  }
  await admin.from("billing_events").insert({ stripe_event_id: event.id, type: event.type, payload: event });

  if (event.type === "checkout.session.completed") {
    const session: any = event.data.object;
    const clientId = session.metadata?.client_id;
    const invoiceIds: string[] = session.metadata?.invoice_ids
      ? session.metadata.invoice_ids.split(",").filter(Boolean)
      : [];
    const amountTotal = session.amount_total || 0;
    const paymentIntentId = session.payment_intent as string | null;

    let paymentMethodSummary = "Card";
    if (paymentIntentId) {
      try {
        const paymentIntent: any = await stripe.paymentIntents.retrieve(paymentIntentId, {
          expand: ["payment_method"]
        });
        const pm = paymentIntent.payment_method;
        if (pm && pm.card) {
          paymentMethodSummary = `${String(pm.card.brand).toUpperCase()} \u2022\u2022\u2022\u2022 ${pm.card.last4}`;
        }
      } catch (error) {
        paymentMethodSummary = "Card";
      }
    }

    if (clientId && invoiceIds.length > 0) {
      const invoicesResult = await admin
        .from("invoices")
        .select("id, amount_cents, amount_paid_cents")
        .in("id", invoiceIds);
      const invoices: any[] = invoicesResult.data || [];
      const totalOwed =
        invoices.reduce((sum, invoice) => sum + (invoice.amount_cents - invoice.amount_paid_cents), 0) || 1;

      for (const invoice of invoices) {
        const owed = invoice.amount_cents - invoice.amount_paid_cents;
        const share = invoices.length === 1 ? amountTotal : Math.round((owed / totalOwed) * amountTotal);
        const newPaid = invoice.amount_paid_cents + share;
        const status = newPaid >= invoice.amount_cents ? "Paid" : "Partial";

        await admin
          .from("invoices")
          .update({
            amount_paid_cents: newPaid,
            status,
            paid_at: status === "Paid" ? new Date().toISOString() : null,
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: paymentIntentId
          })
          .eq("id", invoice.id);

        await admin.from("payments").insert({
          client_id: clientId,
          invoice_id: invoice.id,
          stripe_payment_intent_id: paymentIntentId,
          stripe_checkout_session_id: session.id,
          amount_cents: share,
          status: "succeeded",
          payment_method_summary: paymentMethodSummary,
          confirmation_number: paymentIntentId || session.id
        });
      }
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent: any = event.data.object;
    const clientId = paymentIntent.metadata?.client_id;
    if (clientId) {
      await admin.from("payments").insert({
        client_id: clientId,
        stripe_payment_intent_id: paymentIntent.id,
        amount_cents: paymentIntent.amount || 0,
        status: "failed",
        confirmation_number: paymentIntent.id
      });
    }
  }

  if (event.type === "charge.refunded") {
    const charge: any = event.data.object;
    const paymentIntentId = charge.payment_intent as string | null;
    if (paymentIntentId) {
      await admin.from("payments").update({ status: "refunded" }).eq("stripe_payment_intent_id", paymentIntentId);
      await admin
        .from("invoices")
        .update({ status: "Refunded" })
        .eq("stripe_payment_intent_id", paymentIntentId);
    }
  }

  return NextResponse.json({ received: true });
}
