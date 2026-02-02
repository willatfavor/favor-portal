"use client";

import { useAuth } from "@/hooks/use-auth";
import { useGiving } from "@/hooks/use-giving";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GivingSummary } from "@/components/giving/giving-summary";
import { Badge } from "@/components/ui/badge";
import { Heart, Download, Repeat, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function GivingPage() {
  const { user } = useAuth();
  const { gifts, recurringGifts, totalGiven, ytdGiven, isLoading } = useGiving(user?.id);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-[#666666]">Loading your giving information...</div>
      </div>
    );
  }

  // Get most recent gift
  const mostRecentGift = gifts[0];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Cormorant_Garamond'] text-3xl font-semibold text-[#1a1a1a]">
            Your Giving
          </h1>
          <p className="mt-1 text-[#666666]">
            Track your gifts, manage recurring donations, and see your impact.
          </p>
        </div>
        <Button className="bg-[#2b4d24] hover:bg-[#1a3a15]" asChild>
          <Link href="/giving">
            <Heart className="mr-2 h-4 w-4" />
            Give Now
          </Link>
        </Button>
      </div>

      {/* Giving Summary Cards */}
      <GivingSummary totalGiven={totalGiven} ytdGiven={ytdGiven} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Most Recent Gift */}
          {mostRecentGift && (
            <Card>
              <CardHeader>
                <CardTitle className="font-['Cormorant_Garamond'] flex items-center gap-2">
                  <Heart className="h-5 w-5 text-[#2b4d24]" />
                  Most Recent Gift
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between rounded-lg bg-[#f5f5f0] p-4">
                  <div>
                    <p className="text-2xl font-semibold text-[#1a1a1a]">
                      ${mostRecentGift.amount.toLocaleString()}
                    </p>
                    <p className="text-sm text-[#666666]">
                      {mostRecentGift.designation} • {new Date(mostRecentGift.date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={mostRecentGift.isRecurring ? "default" : "secondary"}>
                    {mostRecentGift.isRecurring ? "Recurring" : "One-time"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle className="font-['Cormorant_Garamond']">Quick Actions</CardTitle>
              <CardDescription>Manage your giving preferences</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/giving/history" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  View Full History
                  <ArrowRight className="ml-auto h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" className="justify-start">
                <Download className="mr-2 h-4 w-4" />
                Download Tax Receipt
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Recurring Gifts */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-['Cormorant_Garamond'] flex items-center gap-2">
                <Repeat className="h-5 w-5 text-[#2b4d24]" />
                Recurring Gifts
              </CardTitle>
              <CardDescription>Your active recurring commitments</CardDescription>
            </CardHeader>
            <CardContent>
              {recurringGifts.length > 0 ? (
                <div className="space-y-4">
                  {recurringGifts.map((gift) => (
                    <div
                      key={gift.id}
                      className="flex items-center justify-between rounded-lg border border-[#e5e5e0] p-3"
                    >
                      <div>
                        <p className="font-medium text-[#1a1a1a]">
                          ${gift.amount.toLocaleString()}/{gift.frequency}
                        </p>
                        <p className="text-xs text-[#666666]">
                          Next: {new Date(gift.nextChargeDate).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[#2b4d24]">
                        {gift.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Repeat className="mx-auto h-8 w-8 text-[#e5e5e0]" />
                  <p className="mt-2 text-sm text-[#666666]">No active recurring gifts</p>
                  <Button variant="link" className="text-[#2b4d24]" asChild>
                    <Link href="/giving">Set one up</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Impact Card */}
          <Card className="bg-gradient-to-br from-[#2b4d24] to-[#3d6633] text-[#FFFEF9]">
            <CardHeader>
              <CardTitle className="text-[#FFFEF9] font-['Cormorant_Garamond']">
                Your Impact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-[#FFFEF9]">1,247</p>
                <p className="text-sm text-[#FFFEF9]/80">Lives impacted this year</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-xl font-semibold text-[#FFFEF9]">12</p>
                  <p className="text-xs text-[#FFFEF9]/80">Communities served</p>
                </div>
                <div>
                  <p className="text-xl font-semibold text-[#FFFEF9]">4</p>
                  <p className="text-xs text-[#FFFEF9]/80">Countries reached</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
