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
return NextResponse.json({ error: "Only admins can send access links." }, { status: 403 });
}

const admin = supabaseAdmin();
if (!admin) {
return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
}

const clientResult = await admin.from("clients").select("id, profiles(email)").eq("id", clientId).single();
const client: any = clientResult.data;

if (clientResult.error || !client || !client.profiles?.email) {
return NextResponse.json({ error: "Client email not found." }, { status: 404 });
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

const resetResult = await admin.auth.resetPasswordForEmail(client.profiles.email, {
redirectTo: `${siteUrl}/reset-password`
});

if (resetResult.error) {
return NextResponse.json({ error: resetResult.error.message }, { status: 500 });
}

return NextResponse.json({ success: true });
}
