"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  href?: string;
  linkText?: string;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  href,
  linkText = "View All",
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div>
        <h2 className="font-serif text-2xl font-semibold text-[#1a1a1a]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-[#666666]">{subtitle}</p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="flex shrink-0 items-center gap-1 text-sm font-medium text-[#2b4d24] transition-colors hover:text-[#1a3a15]"
        >
          {linkText}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
