"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Badge({ className, variant = "default", ...props }: React.ComponentProps<"span"> & { variant?: "default" | "secondary" | "destructive" | "outline" }) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cn(
        "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 transition-colors",
        variant === "default" && "bg-[#2b4d24] text-[#FFFEF9] border-transparent",
        variant === "secondary" && "glass-subtle text-[#1a1a1a] border-transparent",
        variant === "destructive" && "bg-red-100 text-red-700 border-transparent",
        variant === "outline" && "bg-transparent border-[#d9e1d2] text-[#1a1a1a]",
        className
      )}
      {...props}
    />
  )
}

export { Badge }
