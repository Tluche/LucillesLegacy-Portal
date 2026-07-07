import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { stripeServer } from "@/lib/stripe";

export async function GET() {
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
    .select("stripe_customer_id")
    .eq("profile_id", user.id)
    .single();
  const client: any = clientResult.data;
  if (!client?.stripe_customer_id) {
    return NextResponse.json({ paymentMethods: [] });
  }

  const stripe = stripeServer();
  if (!stripe) {
    return NextResponse.json({ paymentMethods: [] });
  }

  const methods = await stripe.paymentMethods.list({ customer: client.stripe_customer_id, type: "card" });
  const customer: any = await stripe.customers.retrieve(client.stripe_customer_id);
  const defaultId = customer?.invoice_settings?.default_payment_method || customer?.default_source || null;

  const paymentMethods = methods.data.map((method) => ({
    id: method.id,
    brand: method.card?.brand,
    last4: method.card?.last4,
    expMonth: method.card?.exp_month,
    expYear: method.card?.exp_year,
    isDefault: method.id === defaultId
  }));

  return NextResponse.json({ paymentMethods });
}
