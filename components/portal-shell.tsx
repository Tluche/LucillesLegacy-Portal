"use client";

import Link from "next/link";
import type React from "react";
import { useState } from "react";
import {
Bell,
CalendarDays,
CreditCard,
FileText,
FolderUp,
Home,
LogOut,
Menu,
MessageSquare,
ShieldCheck,
User,
Users,
UserPlus,
X,
type LucideIcon
} from "lucide-react";
import type { UserRole } from "@/lib/types";

type NavItem = {
id: string;
label: string;
icon: LucideIcon;
};

const clientItems: NavItem[] = [
{ id: "dashboard", label: "Dashboard", icon: Home },
{ id: "messages", label: "Messages", icon: MessageSquare },
{ id: "documents", label: "Upload Documents", icon: FolderUp },
{ id: "status", label: "Service Status", icon: ShieldCheck },
{ id: "appointments", label: "Appointments", icon: CalendarDays },
{ id: "billing", label: "Billing", icon: CreditCard },
{ id: "resources", label: "Resources", icon: FileText },
{ id: "profile", label: "Profile", icon: User }
];

const adminItems: NavItem[] = [
{ id: "admin", label: "Admin Home", icon: Users },
{ id: "admin-leads", label: "Leads", icon: UserPlus },
{ id: "admin-clients", label: "Clients", icon: User },
{ id: "admin-documents", label: "Documents", icon: FolderUp },
{ id: "admin-resources", label: "Resources", icon: FileText },
{ id: "admin-messages", label: "Messages", icon: MessageSquare },
{ id: "admin-billing", label: "Billing", icon: CreditCard }
];

export function PortalShell({
role,
active,
onChange,
children
}: {
role: UserRole;
active: string;
onChange: (section: string) => void;
children: React.ReactNode;
}) {
const [open, setOpen] = useState(false);
const items = role === "admin" ? adminItems : clientItems;

function selectSection(section: string) {
onChange(section);
setOpen(false);
}

return (
<div className="min-h-screen bg-white lg:grid lg:grid-cols-[18rem_1fr]">
<header className="sticky top-0 z-30 flex items-center justify-between border-b border-legacy-silver bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
<button
aria-label="Open navigation"
onClick={() => setOpen(true)}
className="rounded-lg border border-legacy-silver p-2 text-legacy-plum"
>
<Menu size={22} />
</button>
<div className="text-center">
<p className="text-xs font-bold uppercase tracking-normal text-legacy-purple">Lucille&apos;s Legacy</p>
<p className="text-sm font-black text-legacy-ink">Client Portal</p>
</div>
<Bell size={22} className="text-legacy-plum" />
</header>

<aside
className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-legacy-silver bg-white p-4 shadow-soft transition lg:static lg:translate-x-0 lg:shadow-none ${
open ? "translate-x-0" : "-translate-x-full"
}`}
>
<div className="mb-7 flex items-center justify-between">
<div className="flex items-center gap-3">
<img
src="/lucilles-legacy-logo.png"
alt="Lucille's Legacy logo"
className="h-12 w-12 rounded-xl border border-legacy-silver object-cover"
/>
<div>
<p className="font-black text-legacy-ink">Lucille&apos;s Legacy</p>
<p className="text-sm text-legacy-muted">Financial client hub</p>
</div>
</div>
<button
aria-label="Close navigation"
onClick={() => setOpen(false)}
className="rounded-lg p-2 text-legacy-muted lg:hidden"
>
<X size={22} />
</button>
</div>

<nav className="grid gap-2" aria-label="Portal navigation">
{items.map((item) => (
<button
key={item.id}
onClick={() => selectSection(item.id)}
className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left font-bold transition ${
active === item.id
? "bg-legacy-lavender text-legacy-plum"
: "text-legacy-muted hover:bg-legacy-lavender/70 hover:text-legacy-plum"
}`}
>
<item.icon size={19} />
{item.label}
</button>
))}
</nav>

<div className="mt-8 rounded-2xl border border-legacy-silver bg-[#fbfafe] p-4">
<p className="text-sm font-black text-legacy-ink">Need help?</p>
<p className="mt-1 text-sm leading-6 text-legacy-muted">
Send a message or upload what is requested. We will guide you step by step.
</p>
</div>

<Link
href="/login"
className="mt-6 flex items-center gap-3 rounded-xl px-3 py-3 font-bold text-legacy-muted hover:bg-legacy-lavender hover:text-legacy-plum"
>
<LogOut size={19} />
Logout
</Link>
</aside>

{open ? <button aria-label="Close navigation overlay" className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setOpen(false)} /> : null}

<main className="min-w-0 bg-[#fbfafe]">
<div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">{children}</div>
</main>
</div>
);
}
