"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useGiving } from "@/hooks/use-giving";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Download, Repeat, Calendar, ArrowRight, TrendingUp } from "lucide-react";
import Link from "next/link";
import { SectionHeader } from "@/components/portal/section-header";
import { EmptyState } from "@/components/portal/empty-state";
import { GiveNowDialog } from "@/components/portal/give-now-dialog";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

export default function GivingPage() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const { gifts, recurringGifts, totalGiven, ytdGiven, isLoading } = useGiving(user?.id, refreshKey);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-[#666666]">Loading your giving information...</div>
      </div>
    );
  }

  const mostRecentGift = gifts[0];

  function downloadTaxReceipt() {
    const year = new Date().getFullYear() - 1;
    const text = [
      `FAVOR INTERNATIONAL — ${year} ANNUAL TAX RECEIPT`,
      "=".repeat(48),
      "",
      `Donor: ${user?.firstName} ${user?.lastName}`,
      `Email: ${user?.email}`,
      "",
      `Total Gifts in ${year}: ${formatCurrency(ytdGiven)}`,
      `Number of Gifts: ${gifts.filter((g) => new Date(g.date).getFullYear() === year).length}`,
      "",
      "Favor International, Inc.",
      "3433 Lithia Pinecrest Rd #356, Valrico, FL 33596",
      "EIN: XX-XXXXXXX",
      "501(c)(3) Non-Profit Organization",
      "",
      "All contributions are tax-deductible to the extent allowed by law.",
    ].join("\n");

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `favor-tax-receipt-${year}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Tax receipt downloaded");
  }

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav className="mb-2 flex items-center gap-1 text-xs text-[#999999]">
            <Link href="/dashboard" className="hover:text-[#666666]">Home</Link>
            <span>/</span>
            <span className="font-medium text-[#1a1a1a]">Giving</span>
          </nav>
          <h1 className="font-serif text-3xl font-semibold text-[#1a1a1a]">
            Your Giving
          </h1>
          <p className="mt-1 text-sm text-[#666666]">
            Track your gifts, manage recurring donations, and see your impact.
          </p>
        </div>
        <GiveNowDialog onGiftComplete={() => setRefreshKey((k) => k + 1)} />
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Lifetime Giving", value: formatCurrency(totalGiven), icon: Heart },
          { label: "Year to Date", value: formatCurrency(ytdGiven), icon: Calendar },
          { label: "Monthly Average", value: formatCurrency(Math.round((ytdGiven) / (new Date().getMonth() + 1))), icon: TrendingUp },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2b4d24]/5">
                <stat.icon className="h-5 w-5 text-[#2b4d24]" />
              </div>
              <div>
                <p className="text-xs text-[#999999]">{stat.label}</p>
                <p className="text-xl font-semibold text-[#1a1a1a]">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          {/* Most Recent Gift */}
          {mostRecentGift ? (
            <section>
              <SectionHeader title="Most Recent Gift" />
              <Card className="mt-4">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-semibold text-[#1a1a1a]">
                        ${mostRecentGift.amount.toLocaleString()}
                      </p>
                      <p className="text-sm text-[#666666]">
                        {mostRecentGift.designation} &middot;{" "}
                        {new Date(mostRecentGift.date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={mostRecentGift.isRecurring ? "default" : "secondary"}>
                      {mostRecentGift.isRecurring ? "Recurring" : "One-time"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </section>
          ) : (
            <EmptyState
              icon={Heart}
              title="No gifts yet"
              description="Make your first gift to Favor International and see it here."
            />
          )}

          {/* Quick Actions */}
          <section>
            <SectionHeader title="Quick Actions" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Button variant="outline" className="justify-start h-auto py-3" asChild>
                <Link href="/giving/history" className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-[#2b4d24]" />
                  <div className="text-left">
                    <p className="text-sm font-medium">View Full History</p>
                    <p className="text-xs text-[#666666]">All gifts and receipts</p>
                  </div>
                  <ArrowRight className="ml-auto h-4 w-4 text-[#999999]" />
                </Link>
              </Button>
              <Button
                variant="outline"
                className="justify-start h-auto py-3"
                onClick={downloadTaxReceipt}
              >
                <Download className="h-4 w-4 text-[#2b4d24]" />
                <div className="text-left ml-3">
                  <p className="text-sm font-medium">Download Tax Receipt</p>
                  <p className="text-xs text-[#666666]">{new Date().getFullYear() - 1} annual receipt</p>
                </div>
              </Button>
            </div>
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Recurring Gifts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-serif flex items-center gap-2 text-lg">
                <Repeat className="h-4 w-4 text-[#2b4d24]" />
                Recurring Gifts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recurringGifts.length > 0 ? (
                <div className="space-y-3">
                  {recurringGifts.map((gift) => (
                    <div
                      key={gift.id}
                      className="flex items-center justify-between rounded-lg glass-inset p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#1a1a1a]">
                          ${gift.amount.toLocaleString()}/{gift.frequency}
                        </p>
                        <p className="text-xs text-[#999999]">
                          Next: {new Date(gift.nextChargeDate).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[#2b4d24] text-[10px]">
                        {gift.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <Repeat className="mx-auto h-8 w-8 text-[#c5ccc2]" />
                  <p className="mt-2 text-sm text-[#666666]">No active recurring gifts</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Impact */}
          <Card className="bg-gradient-to-br from-[#2b4d24] to-[#3d6633] text-white">
            <CardContent className="space-y-4 p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-white/60">Your Impact</p>
              <div className="text-center">
                <p className="text-3xl font-bold">1,247</p>
                <p className="text-sm text-white/70">Lives impacted this year</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg glass-hero p-3">
                  <p className="text-lg font-semibold">12</p>
                  <p className="text-[10px] text-white/60">Communities</p>
                </div>
                <div className="rounded-lg glass-hero p-3">
                  <p className="text-lg font-semibold">4</p>
                  <p className="text-[10px] text-white/60">Countries</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
