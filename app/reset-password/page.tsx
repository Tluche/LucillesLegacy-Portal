"use client";

import Link from "next/link";
import type React from "react";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = supabaseBrowser();
    if (!supabase) {
      setMessage("Add Supabase keys to enable password reset.");
      setChecking(false);
      return;
    }

    supabase.auth.getSession().then((result) => {
      if (result.data.session) {
        setReady(true);
      }
      setChecking(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setReady(true);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    const supabase = supabaseBrowser();
    if (!supabase) {
      setMessage("Password reset is currently unavailable.");
      return;
    }

    setSaving(true);
    const result = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    await supabase.auth.signOut();
    setDone(true);
  }

  return (
    <main className="page-pad grid min-h-screen place-items-center">
      <div className="soft-panel grid w-full max-w-md gap-5 p-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-normal text-legacy-purple">Lucille&apos;s Legacy</p>
          <h1 className="mt-2 text-3xl font-black text-legacy-ink">Reset your password</h1>
          <p className="mt-2 text-legacy-muted">Choose a new password for your client portal account.</p>
        </div>

        {done ? (
          <>
            <p className="rounded-lg bg-legacy-lavender p-3 text-sm text-legacy-plum">
              Your password has been updated. You can now sign in.
            </p>
            <Link href="/login" className="rounded-lg bg-legacy-purple px-5 py-3 text-center font-black text-white">
              Go to sign in
            </Link>
          </>
        ) : checking ? (
          <p className="text-legacy-muted">Checking your reset link...</p>
        ) : ready ? (
          <form onSubmit={handleSubmit} className="grid gap-4">
            <label className="grid gap-2 font-bold text-legacy-ink">
              New password
              <input
                className="rounded-lg border border-legacy-silver px-3 py-3 font-normal"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
            </label>
            <label className="grid gap-2 font-bold text-legacy-ink">
              Confirm password
              <input
                className="rounded-lg border border-legacy-silver px-3 py-3 font-normal"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                required
              />
            </label>
            <button disabled={saving} className="rounded-lg bg-legacy-purple px-5 py-3 font-black text-white disabled:opacity-50">
              {saving ? "Saving..." : "Reset password"}
            </button>
            {message ? <p className="rounded-lg bg-legacy-lavender p-3 text-sm text-legacy-plum">{message}</p> : null}
          </form>
        ) : (
          <>
            <p className="rounded-lg bg-legacy-lavender p-3 text-sm text-legacy-plum">
              This reset link is invalid or has expired. Please request a new password reset email.
            </p>
            <Link href="/forgot-password" className="text-sm font-bold text-legacy-purple">
              Request a new link
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
