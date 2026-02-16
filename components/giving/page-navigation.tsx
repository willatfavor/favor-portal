"use client";

import Link from "next/link";
import { ChevronLeft, Home } from "lucide-react";

interface PageBreadcrumbProps {
  items: { label: string; href?: string }[];
  showHome?: boolean;
}

export function PageBreadcrumb({ items, showHome = true }: PageBreadcrumbProps) {
  return (
    <nav className="mb-2 flex items-center gap-1 text-xs text-[#999999]">
      {showHome && (
        <>
          <Link href="/dashboard" className="hover:text-[#666666] flex items-center gap-1">
            <Home className="h-3 w-3" />
            Home
          </Link>
          <span>/</span>
        </>
      )}
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1">
          {index > 0 && <span>/</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-[#666666]">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-[#1a1a1a]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

interface PageBackButtonProps {
  href: string;
  label?: string;
}

export function PageBackButton({ href, label = "Back" }: PageBackButtonProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm text-[#666666] hover:text-[#1a1a1a] transition-colors mb-4"
    >
      <ChevronLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}
