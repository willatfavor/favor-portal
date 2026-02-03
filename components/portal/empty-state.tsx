"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl glass-subtle border-dashed px-6 py-16 text-center",
        className
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#2b4d24]/5">
        <Icon className="h-7 w-7 text-[#8b957b]" />
      </div>
      <h3 className="font-serif text-xl font-semibold text-[#1a1a1a]">
        {title}
      </h3>
      <p className="mt-2 max-w-sm text-sm text-[#666666]">{description}</p>
      {actionLabel && (actionHref || onAction) && (
        <div className="mt-6">
          {actionHref ? (
            <Button
              className="bg-[#2b4d24] hover:bg-[#1a3a15]"
              asChild
            >
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          ) : (
            <Button
              className="bg-[#2b4d24] hover:bg-[#1a3a15]"
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
