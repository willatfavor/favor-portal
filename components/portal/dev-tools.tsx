"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { User } from "@/types";
import { getMockUsers, resetMockStore } from "@/lib/mock-store";
import { GIVING_TIERS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, Shield, UserRound, RotateCcw } from "lucide-react";

const TIER_PRESETS = [
  { label: "Partner (0-999)", value: 500 },
  { label: "Silver (1k+)", value: 1500 },
  { label: "Gold (5k+)", value: 7500 },
  { label: "Platinum (10k+)", value: 15000 },
];

export function DevTools() {
  const { user, isDev, setDevUser, updateDevUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!isDev) return;
    setUsers(getMockUsers());
  }, [isDev]);

  useEffect(() => {
    if (!isDev) {
      setEnabled(false);
      return;
    }
    setEnabled(true);
  }, [isDev]);

  const activeUser = user;
  const tierKey = useMemo(() => {
    if (!activeUser) return "Partner";
    if (activeUser.lifetimeGivingTotal >= GIVING_TIERS.PLATINUM.min) return "Platinum";
    if (activeUser.lifetimeGivingTotal >= GIVING_TIERS.GOLD.min) return "Gold";
    if (activeUser.lifetimeGivingTotal >= GIVING_TIERS.SILVER.min) return "Silver";
    return "Partner";
  }, [activeUser]);

  if (!isDev || !enabled) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 text-[#8b957b] hover:text-[#2b4d24] glass-transition"
          aria-label="QA tools"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide">QA</span>
          <Settings className="h-4.5 w-4.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg glass-elevated border-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-xl">
            <Shield className="h-4 w-4 text-[#2b4d24]" /> Dev Console
          </DialogTitle>
          <DialogDescription>
            Switch mock users, adjust tiers, and reset seed data for QA.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-xl glass-inset p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#999999]">Active User</p>
                <p className="text-sm font-medium text-[#1a1a1a]">
                  {activeUser?.firstName} {activeUser?.lastName}
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-[10px] text-[#8b957b]">
                    {activeUser?.constituentType.replace("_", " ")}
                  </Badge>
                  {activeUser?.isAdmin && (
                    <Badge className="bg-[#2b4d24] text-[#FFFEF9] text-[10px]">Admin</Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] text-[#8b957b]">
                    {tierKey}
                  </Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin">
                  Admin Console
                </Link>
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-[#8b957b]">Switch User</p>
            <Select
              value={activeUser?.id}
              onValueChange={(value) => {
                setDevUser?.(value);
                setUsers(getMockUsers());
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} - {u.constituentType.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-medium text-[#8b957b]">Constituent Type</p>
              <Select
                value={activeUser?.constituentType}
                onValueChange={(value) =>
                  updateDevUser?.({ constituentType: value as User["constituentType"] })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "individual",
                    "major_donor",
                    "church",
                    "foundation",
                    "daf",
                    "ambassador",
                    "volunteer",
                  ].map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-[#8b957b]">Giving Tier</p>
              <Select
                value={tierKey}
                onValueChange={(value) => {
                  const match = TIER_PRESETS.find((t) => t.label.startsWith(value));
                  updateDevUser?.({ lifetimeGivingTotal: match?.value ?? 0 });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tier" />
                </SelectTrigger>
                <SelectContent>
                  {TIER_PRESETS.map((tier) => (
                    <SelectItem key={tier.label} value={tier.label.split(" ")[0]}>
                      {tier.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl glass-inset p-4">
            <div className="flex items-center gap-3">
              <UserRound className="h-4 w-4 text-[#2b4d24]" />
              <div>
                <p className="text-sm font-medium text-[#1a1a1a]">Reset Mock Data</p>
                <p className="text-xs text-[#999999]">Restore default seed data</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetMockStore();
                setUsers(getMockUsers());
                setDevUser?.(getMockUsers()[0]?.id ?? "");
              }}
            >
              <RotateCcw className="mr-2 h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
