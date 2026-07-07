import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripeServer } from "@/lib/stripe";

export async function POST(request: Request) {
  const body = await request.json();
  const paymentId = body.paymentId;

  if (!paymentId) {
    return NextResponse.json({ error: "Missing paymentId." }, { status: 400 });
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
    return NextResponse.json({ error: "Only admins can issue refunds." }, { status: 403 });
  }

  const admin = supabaseAdmin();
  const stripe = stripeServer();
  if (!admin || !stripe) {
    return NextResponse.json({ error: "Stripe is not configured yet." }, { status: 500 });
  }

  const paymentResult = await admin
    .from("payments")
    .select("id, stripe_payment_intent_id, amount_cents, status")
    .eq("id", paymentId)
    .single();
  const payment = paymentResult.data;

  if (!payment) {
    return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  }
  if (!payment.stripe_payment_intent_id) {
    return NextResponse.json(
      { error: "This payment has no linked Stripe transaction to refund." },
      { status: 400 }
    );
  }
  if (payment.status === "refunded") {
    return NextResponse.json({ error: "This payment has already been refunded." }, { status: 400 });
  }

  await stripe.refunds.create({ payment_intent: payment.stripe_payment_intent_id });

  return NextResponse.json({ success: true });
}
