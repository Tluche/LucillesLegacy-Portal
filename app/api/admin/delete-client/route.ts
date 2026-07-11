import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
    const body = await request.json();
    const clientId = body.clientId;

  if (!clientId) {
        return NextResponse.json({ error: "Missing clientId." }, { status: 400 });
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
        return NextResponse.json({ error: "Only admins can delete clients." }, { status: 403 });
  }

  const admin = supabaseAdmin();
    if (!admin) {
          return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
    }

  const clientResult = await admin.from("clients").select("id, profile_id").eq("id", clientId).single();
    const client: any = clientResult.data;

  if (clientResult.error || !client) {
        return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  const profileId = client.profile_id;

  const servicesResult = await admin.from("client_services").select("id").eq("client_id", clientId);
    const serviceIds = (servicesResult.data || []).map((row: any) => row.id);

  if (serviceIds.length > 0) {
        await admin.from("service_status_updates").delete().in("client_service_id", serviceIds);
  }

  await admin.from("client_timeline").delete().eq("client_id", clientId);
    await admin.from("client_services").delete().eq("client_id", clientId);
    await admin.from("documents").delete().eq("client_id", clientId);
    await admin.from("appointments").delete().eq("client_id", clientId);
    await admin.from("invoices").delete().eq("client_id", clientId);
    await admin.from("notifications").delete().eq("client_id", clientId);
    await admin.from("messages").delete().eq("client_id", clientId);

  const clientDeleteResult = await admin.from("clients").delete().eq("id", clientId);
    if (clientDeleteResult.error) {
          return NextResponse.json({ error: clientDeleteResult.error.message }, { status: 500 });
    }

  if (profileId) {
        const userDeleteResult = await admin.auth.admin.deleteUser(profileId);
        if (userDeleteResult.error) {
                return NextResponse.json({
                          success: true,
                          warning: "Client data removed, but the login account could not be deleted: " + userDeleteResult.error.message
                });
        }
  }

  return NextResponse.json({ success: true });
}
