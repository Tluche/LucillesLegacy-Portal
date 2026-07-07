import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripeServer } from "@/lib/stripe";

export async function POST(request: Request) {
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

  const stripe = stripeServer();
  const admin = supabaseAdmin();
  if (!stripe || !admin) {
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

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${siteUrl}/portal`
  });

  return NextResponse.json({ url: portalSession.url });
}
