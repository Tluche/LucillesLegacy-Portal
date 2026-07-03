""use client";

import type { LucideIcon } from "lucide-react";
import {
  Home, MessageSquare, FolderUp, ShieldCheck, CalendarDays, Banknote,
  FileText, User, Users, LogOut, Menu, X
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types";

export type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

const clientItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "documents", label: "Documents", icon: FolderUp },
  { id: "status", label: "Service Status", icon: ShieldCheck },
  { id: "appointments", label: "Appointments", icon: CalendarDays },
  { id: "billing", label: "Billing", icon: Banknote },
  { id: "resources", label: "Resources", icon: FileText },
  { id: "profile", label: "Profile", icon: User },
];

const adminItems: NavItem[] = [
  { id: "admin", label: "Dashboard", icon: Home },
  { id: "admin-clients", label: "Clients", icon: Users },
  { id: "admin-documents", label: "Documents", icon: FolderUp },
  { id: "admin-messages", label: "Messages", icon: MessageSquare },
  { id: "admin-billing", label: "Billing", icon: Banknote },
];

export function PortalShell({
  role,
  active,
  onChange,
  children,
}: {
  role: UserRole;
  active: string;
  onChange: (id: string) => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const items = role === "admin" ? adminItems : clientItems;

  async function handleLogout() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-legacy-silver bg-white transition-transform lg:static lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-6">
          <span className="text-lg font-black text-legacy-plum">Lucille&apos;s Legacy</span>
          <button className="lg:hidden" onClick={() => setMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onChange(item.id);
                  setMenuOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold transition ${
                  isActive ? "bg-legacy-purple text-white shadow-soft" : "text-legacy-ink hover:bg-legacy-lavender"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="px-3 py-6">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-legacy-muted hover:bg-legacy-lavender"
          >
            <LogOut size={18} />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 lg:ml-64">
        <header className="flex items-center justify-between border-b border-legacy-silver bg-white px-4 py-3 lg:hidden">
          <span className="font-black text-legacy-plum">Lucille&apos;s Legacy</span>
          <button onClick={() => setMenuOpen(true)}>
            <Menu size={22} />
          </button>
        </header>
        <main className="page-pad">{children}</main>
      </div>
    </div>
  );
}