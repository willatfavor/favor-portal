"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { getMockUsers } from "@/lib/mock-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  Users,
  GraduationCap,
  FileText,
  Mail,
  LifeBuoy,
  ArrowLeft,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  { name: "Overview", href: "/admin", icon: Home },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "LMS", href: "/admin/courses", icon: GraduationCap },
  { name: "Content", href: "/admin/content", icon: FileText },
  { name: "Comms", href: "/admin/communications", icon: Mail },
  { name: "Support", href: "/admin/support", icon: LifeBuoy },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isDev, setDevUser } = useAuth();

  const activeHref = useMemo(() => {
    const exact = ADMIN_NAV.find((item) => pathname === item.href);
    if (exact) return exact.href;
    const prefix = ADMIN_NAV.find((item) => pathname.startsWith(item.href));
    return prefix?.href;
  }, [pathname]);

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center px-4">
        <div className="max-w-md rounded-2xl glass-pane p-6 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#2b4d24]/10">
            <Shield className="h-6 w-6 text-[#2b4d24]" />
          </div>
          <div>
            <h2 className="font-serif text-2xl text-[#1a1a1a]">Admin access required</h2>
            <p className="text-sm text-[#666666] mt-2">
              This area is reserved for internal staff. Switch to an admin profile to continue.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Portal
              </Link>
            </Button>
            {isDev && (
              <Button
                className="bg-[#2b4d24] hover:bg-[#1a3a15]"
                onClick={() => {
                  const adminUser = getMockUsers().find((u) => u.isAdmin);
                  if (adminUser) setDevUser?.(adminUser.id);
                }}
              >
                Switch to Admin
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <header className="glass-bar sticky top-0 z-40">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Badge className="bg-[#2b4d24] text-[#FFFEF9]">Admin Console</Badge>
            <span className="text-xs text-[#8b957b]">Favor International</span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Portal
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
          <aside className="space-y-2">
            {ADMIN_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === activeHref;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium glass-transition",
                    isActive
                      ? "bg-[#2b4d24] text-[#FFFEF9]"
                      : "text-[#666666] hover:bg-white/60 hover:text-[#1a1a1a]"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </aside>
          <div>{children}</div>
        </div>
      </main>
    </div>
  );
}
