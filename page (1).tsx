import Link from "next/link";
import { ArrowRight, BadgeCheck, FileLock2, MessageSquareText } from "lucide-react";

const highlights = [
  {
    icon: BadgeCheck,
    title: "Know your next step",
    text: "Clients can quickly see what stage they are in and what is needed next."
  },
  {
    icon: FileLock2,
    title: "Organized documents",
    text: "Tax, credit, bookkeeping, life insurance, and general uploads stay easy to find."
  },
  {
    icon: MessageSquareText,
    title: "Simple communication",
    text: "Messages, appointments, billing notes, and reminders live in one calm workspace."
  }
];

export default function HomePage() {
  return (
    <main className="page-pad flex min-h-screen items-center">
      <section className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <img
            src="/lucilles-legacy-logo.png"
            alt="Lucille's Legacy logo"
            className="mb-6 h-20 w-20 rounded-2xl border border-legacy-silver object-cover shadow-soft"
          />
          <p className="mb-4 text-sm font-bold uppercase tracking-normal text-legacy-purple">
            Lucille&apos;s Legacy
          </p>
          <h1 className="max-w-3xl text-4xl font-black leading-tight text-legacy-ink sm:text-5xl lg:text-6xl">
            A private financial client hub that feels clear, warm, and secure.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-legacy-muted">
            This standalone portal connects to your GoDaddy website with a Client Portal
            button, while the app itself can be hosted on Vercel and powered by Supabase.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-legacy-purple px-5 py-3 font-bold text-white shadow-soft transition hover:bg-legacy-plum"
            >
              Open client login <ArrowRight size={18} />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-lg border border-legacy-silver bg-white px-5 py-3 font-bold text-legacy-plum transition hover:border-legacy-purple"
            >
              View client portal
            </Link>
          </div>
        </div>

        <div className="soft-panel p-5 sm:p-6">
          <div className="rounded-2xl bg-legacy-lavender p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-legacy-purple">Client Snapshot</p>
                <h2 className="text-2xl font-black text-legacy-ink">Tax Preparation</h2>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-legacy-plum">
                68%
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white">
              <div className="h-full w-[68%] rounded-full bg-legacy-purple" />
            </div>
            <p className="mt-4 text-sm leading-6 text-legacy-muted">
              Current stage: Return Being Prepared. Next step: Review draft return when ready.
            </p>
          </div>

          <div className="mt-5 grid gap-3">
            {highlights.map((item) => (
              <article key={item.title} className="flex gap-3 rounded-xl border border-legacy-silver bg-white p-4">
                <item.icon className="mt-1 text-legacy-purple" size={22} />
                <div>
                  <h3 className="font-black text-legacy-ink">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-legacy-muted">{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
