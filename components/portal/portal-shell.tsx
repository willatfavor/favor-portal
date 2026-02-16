"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Menu,
  Bell,
  LogOut,
  User,
  Heart,
  GraduationCap,
  Home,
  History,
  FileText,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationPanel } from "./notification-panel";
import { APP_CONFIG, getGivingTier } from "@/lib/constants";
import { DevTools } from "./dev-tools";

const BASE_NAV_ITEMS = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Giving", href: "/giving", icon: Heart },
  { name: "History", href: "/giving/history", icon: History },
  { name: "Courses", href: "/courses", icon: GraduationCap },
  { name: "Content", href: "/content", icon: FileText },
  { name: "Profile", href: "/profile", icon: User },
];

interface PortalShellProps {
  children: React.ReactNode;
}

export function PortalShell({ children }: PortalShellProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const navItems = useMemo(() => {
    if (user?.isAdmin) {
      return [...BASE_NAV_ITEMS, { name: "Admin", href: "/admin", icon: Shield }];
    }
    return BASE_NAV_ITEMS;
  }, [user]);

  const activeHref = useMemo(() => {
    const matches = navItems.filter((item) => {
      if (pathname === item.href) return true;
      if (item.href === "/dashboard") return false;
      return pathname.startsWith(`${item.href}/`);
    });
    if (matches.length === 0) return undefined;
    return matches.sort((a, b) => b.href.length - a.href.length)[0].href;
  }, [pathname, navItems]);

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : "??";

  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " "));

  const tierLabel = getGivingTier(user?.lifetimeGivingTotal ?? 0).name;

  return (
    <div className="min-h-screen bg-transparent">
      {/* ─── Frosted glass top bar ─── */}
      <header className="glass-bar sticky top-0 z-50">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-[#8b957b] hover:text-[#2b4d24] glass-transition"
                  aria-label="Open navigation"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 glass-elevated p-0 border-r-0">
                <SheetHeader className="border-b border-[#c5ccc2]/20 px-5 py-4">
                  <SheetTitle className="flex items-center gap-2">
                    <Image
                      src={APP_CONFIG.logo}
                      alt="Favor International"
                      width={126}
                      height={28}
                      className="h-7 w-auto"
                      unoptimized
                    />
                  </SheetTitle>
                </SheetHeader>
                <nav className="px-3 py-4">
                  <ul className="space-y-0.5">
                    {navItems.map((item) => {
                      const isActive = item.href === activeHref;
                      const Icon = item.icon;
                      return (
                        <li key={item.name + item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setMenuOpen(false)}
                            aria-current={isActive ? "page" : undefined}
                            className={cn(
                              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium glass-transition",
                              isActive
                                ? "bg-[#2b4d24] text-[#FFFEF9]"
                                : "text-[#666666] hover:bg-white/60 hover:text-[#1a1a1a]"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            {item.name}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
                <div className="absolute bottom-0 left-0 right-0 border-t border-[#c5ccc2]/15 px-5 py-4">
                  <p className="text-xs text-[#8b957b]">
                    {APP_CONFIG.name}
                  </p>
                  <p className="text-[10px] text-[#8b957b]/70 italic">
                    {APP_CONFIG.tagline}
                  </p>
                </div>
              </SheetContent>
            </Sheet>

            <Link href="/dashboard" className="flex items-center gap-1.5">
              <Image
                src={APP_CONFIG.logo}
                alt="Favor International"
                width={108}
                height={24}
                className="h-6 w-auto"
                unoptimized
              />
            </Link>

            {segments.length > 0 && (
              <nav className="hidden md:flex items-center gap-1 text-xs text-[#8b957b]">
                <span className="text-[#c5ccc2]">/</span>
                {segments.map((seg, i) => (
                  <span key={i}>
                    <span className={i === segments.length - 1 ? "text-[#1a1a1a] font-medium" : ""}>
                      {seg}
                    </span>
                    {i < segments.length - 1 && <span className="mx-1 text-[#c5ccc2]">/</span>}
                  </span>
                ))}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Sheet open={notifOpen} onOpenChange={setNotifOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9 text-[#8b957b] hover:text-[#2b4d24] glass-transition"
                  aria-label="Notifications"
                >
                  <Bell className="h-4.5 w-4.5" />
                  <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-[#2b4d24]" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 sm:w-96 glass-elevated p-0 border-l-0">
                <NotificationPanel onClose={() => setNotifOpen(false)} />
              </SheetContent>
            </Sheet>

            <DevTools />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 px-2 hover:bg-white/50 glass-transition"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user?.avatarUrl} alt={`${user?.firstName} ${user?.lastName}`} />
                    <AvatarFallback className="bg-[#2b4d24] text-[#FFFEF9] text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline text-sm font-medium text-[#1a1a1a]">
                    {user?.firstName}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 glass-elevated rounded-xl border-[#c5ccc2]/20">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-[#8b957b]">{tierLabel}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#c5ccc2]/20" />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center gap-2 cursor-pointer"><User className="h-4 w-4" /> Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#c5ccc2]/20" />
                <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600">
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        {children}
      </main>

      <footer className="glass-subtle border-t-0">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-8 sm:flex-row sm:justify-between sm:px-6">
          <p className="text-xs text-[#8b957b]">{APP_CONFIG.name} &middot; 3433 Lithia Pinecrest Rd #356, Valrico, FL 33596</p>
          <p className="text-xs italic text-[#8b957b]/70">{APP_CONFIG.tagline}</p>
        </div>
      </footer>
    </div>
  );
}
