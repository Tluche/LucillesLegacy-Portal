"use client";

import Link from "next/link";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function handleReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = supabaseBrowser();

    if (!supabase) {
      setMessage("Add Supabase keys to send password reset emails.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`
    });

    setMessage(error ? error.message : "Password reset email sent.");
  }

  return (
    <main className="page-pad grid min-h-screen place-items-center">
      <form onSubmit={handleReset} className="soft-panel grid w-full max-w-md gap-5 p-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-normal text-legacy-purple">Lucille&apos;s Legacy</p>
          <h1 className="mt-2 text-3xl font-black text-legacy-ink">Reset password</h1>
          <p className="mt-2 text-legacy-muted">Enter your email and we&apos;ll send reset instructions.</p>
        </div>
        <label className="grid gap-2 font-bold text-legacy-ink">
          Email
          <input
            className="rounded-lg border border-legacy-silver px-3 py-3"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <button className="rounded-lg bg-legacy-purple px-5 py-3 font-black text-white">Send reset link</button>
        {message ? <p className="rounded-lg bg-legacy-lavender p-3 text-sm text-legacy-plum">{message}</p> : null}
        <Link href="/login" className="text-sm font-bold text-legacy-purple">
          Back to sign in
        </Link>
      </form>
    </main>
  );
}
