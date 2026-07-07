import type React from "react";
import type { LucideIcon } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow ? <p className="text-sm font-bold uppercase tracking-normal text-legacy-purple">{eyebrow}</p> : null}
        <h1 className="mt-1 text-3xl font-black text-legacy-ink sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-3xl leading-7 text-legacy-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: LucideIcon }) {
  return (
    <article className="soft-panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-legacy-muted">{label}</p>
          <p className="mt-2 text-3xl font-black text-legacy-ink">{value}</p>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-legacy-lavender text-legacy-purple">
          <Icon size={22} />
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-legacy-muted">{note}</p>
    </article>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-legacy-silver bg-white p-6 text-center">
      <p className="font-black text-legacy-ink">{title}</p>
      <p className="mt-1 text-sm text-legacy-muted">{text}</p>
    </div>
  );
}

export function StatusPill({ children, tone = "purple" }: { children: React.ReactNode; tone?: "purple" | "green" | "gray" | "amber"  | "red"}) {
  const styles = {
    purple: "bg-legacy-lavender text-legacy-plum",
    green: "bg-emerald-50 text-emerald-700",
    gray: "bg-slate-100 text-slate-700",
    amber: "bg-amber-50 text-amber-700",
        red: "bg-red-50 text-red-700"
  };

  return <span className={`rounded-full px-3 py-1 text-xs font-black ${styles[tone]}`}>{children}</span>;
}
