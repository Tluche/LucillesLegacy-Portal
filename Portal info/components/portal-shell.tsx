"use client";

import type { LucideIcon } from "lucide-react";
import { Home, MessageSquare, FolderUp, ShieldCheck, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
};

const clientItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: Home, href: "/dashboard" },
  { id: "messages", label: "Messages", icon: MessageSquare, href: "/dashboard/messages" },
  { id: "documents", label: "Upload Documents", icon: FolderUp, href: "/dashboard/documents" },
  { id: "status", label: "Service Status", icon: ShieldCheck, href: "/dashboard/status" },
];

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-legacy-lavender flex">
      <aside className="w-64 bg-white border-r border-legacy-silver flex flex-col">
        <div className="px-6 py-6">
          <span className="text-legacy-plum font-semibold text-lg">Lucille's Legacy</span>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {clientItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-3 rounded-card px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-legacy-purple text-white shadow-soft" : "text-legacy-ink hover:bg-legacy-lavender"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 pb-6">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-card px-3 py-2 text-sm font-medium text-legacy-muted hover:bg-legacy-lavender"
          >
            <LogOut size={18} />
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
