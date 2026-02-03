"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "glass-inset glass-transition flex h-10 w-full rounded-lg px-3 py-2 text-sm text-[#1a1a1a] placeholder:text-[#8b957b] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2b4d24]/40 focus-visible:border-[#b8c4b2] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
