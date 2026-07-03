"use client";

import Link from "next/link";
import type React from "react";
import { useState } from "react";
import { LockKeyhole, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const supabase = supabaseBrowser();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (signInError) {
      setError("We couldn't sign you in. Please check your email and password and try again.");
      return;
    }

    router.push("/portal");
    router.refresh();
  }

  return (
    <main className="page-pad grid min-h-screen place-items-center">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-[1.5rem] border border-legacy-silver bg-white shadow-soft lg:grid-cols-[0.95fr_1.05fr]">
        <div className="bg-legacy-plum p-8 text-white sm:p-10">
          <img
            src="/lucilles-legacy-logo.png"
            alt="Lucille's Legacy logo"
            className="mb-7 h-24 w-24 rounded-2xl border border-white/15 object-cover shadow-soft"
          />
          <p className="text-sm font-bold uppercase tracking-normal text-white/80">Lucille&apos;s Legacy</p>
          <h1 className="mt-6 text-4xl font-black leading-tight sm:text-5xl">Client Portal</h1>
          <p className="mt-5 leading-7 text-white/80">
            Sign in to see your service status, messages, documents, appointments, billing, and next steps.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5 p-6 sm:p-10">
          <div>
            <h2 className="text-3xl font-black text-legacy-ink">Welcome back</h2>
            <p className="mt-2 text-legacy-muted">Use your email and password to continue.</p>
          </div>

          <label className="grid gap-2 font-bold text-legacy-ink">
            Email
            <span className="flex items-center gap-2 rounded-lg border border-legacy-silver bg-white px-3">
              <Mail size={18} className="text-legacy-muted" />
              <input
                className="w-full border-0 py-3 outline-none"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </span>
          </label>

          <label className="grid gap-2 font-bold text-legacy-ink">
            Password
            <span className="flex items-center gap-2 rounded-lg border border-legacy-silver bg-white px-3">
              <LockKeyhole size={18} className="text-legacy-muted" />
              <input
                className="w-full border-0 py-3 outline-none"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </span>
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <label className="flex items-center gap-2 text-legacy-muted">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                className="h-4 w-4 accent-legacy-purple"
              />
              Remember me
            </label>
            <Link href="/forgot-password" className="font-bold text-legacy-purple hover:text-legacy-plum">
              Forgot password?
            </Link>
          </div>

          <button
            disabled={loading}
            className="rounded-lg bg-legacy-purple px-5 py-3 font-black text-white shadow-soft transition hover:bg-legacy-plum disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
          ) : null}
        </form>
      </section>
    </main>
  );
}