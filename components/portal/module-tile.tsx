"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Heart,
  GraduationCap,
  TrendingUp,
  User,
  Settings,
  FileText,
  Sparkles,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ICON_MAP: Record<string, LucideIcon> = {
  Heart,
  GraduationCap,
  TrendingUp,
  User,
  Settings,
  FileText,
  Sparkles,
  MessageCircle,
};

interface ModuleTileProps {
  title: string;
  description: string;
  icon: string;
  href: string;
  badge?: string;
  onClick?: () => void;
  className?: string;
}

export function ModuleTile({
  title,
  description,
  icon,
  href,
  badge,
  onClick,
  className,
}: ModuleTileProps) {
  const Icon = ICON_MAP[icon] ?? Heart;

  const inner = (
    <div
      className={cn(
        "group relative flex flex-col gap-3 rounded-2xl glass-pane p-6 glass-transition glass-hover",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl glass-inset">
          <Icon className="h-5 w-5 text-[#2b4d24]" />
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
