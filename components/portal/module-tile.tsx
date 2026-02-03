"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Heart,
  GraduationCap,
  TrendingUp,
  User,
  FileText,
  MessageCircle,
  Building2,
  Church,
  Wallet,
  Megaphone,
  HandHeart,
  Star,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ICON_MAP: Record<string, LucideIcon> = {
  Heart,
  GraduationCap,
  TrendingUp,
  User,
  FileText,
  MessageCircle,
  Building2,
  Church,
  Wallet,
  Megaphone,
  HandHeart,
  Star,
};

interface ModuleTileProps {
  title: string;
  description: string;
  icon: string;
  href: string;
  badge?: string;
  accent?: "sage" | "gold" | "stone" | "clay";
  onClick?: () => void;
  className?: string;
}

const ACCENT_STYLES: Record<NonNullable<ModuleTileProps["accent"]>, { icon: string; ring: string }> = {
  sage: { icon: "bg-[#2b4d24]/10 text-[#2b4d24]", ring: "border-[#2b4d24]/20" },
  gold: { icon: "bg-[#e1a730]/15 text-[#a36d4c]", ring: "border-[#e1a730]/30" },
  stone: { icon: "bg-[#8b957b]/15 text-[#2b4d24]", ring: "border-[#c5ccc2]/40" },
  clay: { icon: "bg-[#ba9a86]/15 text-[#8f6b57]", ring: "border-[#ba9a86]/30" },
};

export function ModuleTile({
  title,
  description,
  icon,
  href,
  badge,
  accent = "sage",
  onClick,
  className,
}: ModuleTileProps) {
  const Icon = ICON_MAP[icon] ?? Heart;
  const accentStyle = ACCENT_STYLES[accent];

  const inner = (
    <div
      className={cn(
        "group relative flex flex-col gap-3 rounded-2xl glass-pane p-6 glass-transition glass-hover",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl glass-inset border", accentStyle.ring)}>
          <Icon className={cn("h-5 w-5", accentStyle.icon)} />
        </div>
        {badge && (
          <Badge variant="secondary" className="text-xs">
            {badge}
          </Badge>
        )}
      </div>
      <div>
        <h3 className="font-serif text-lg font-semibold text-[#1a1a1a] group-hover:text-[#2b4d24] transition-colors">
          {title}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-[#666666]">
          {description}
        </p>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="text-left w-full">
        {inner}
      </button>
    );
  }

  return (
    <Link href={href} className="block">
      {inner}
    </Link>
  );
}
