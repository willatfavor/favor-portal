"use client";

import { useAuth } from "@/hooks/use-auth";
import { useGiving } from "@/hooks/use-giving";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GivingTable } from "@/components/giving/giving-table";
import { Download, Filter, Calendar } from "lucide-react";

export default function GivingHistoryPage() {
  const { user } = useAuth();
  const { gifts, isLoading } = useGiving(user?.id);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-[#666666]">Loading your giving history...</div>
      </div>
    );
  }

  // Group gifts by year
  const giftsByYear = gifts.reduce((acc, gift) => {
    const year = new Date(gift.date).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(gift);
    return acc;
  }, {} as Record<number, typeof gifts>);

  const years = Object.keys(giftsByYear).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Cormorant_Garamond'] text-3xl font-semibold text-[#1a1a1a]">
            Giving History
          </h1>
          <p className="mt-1 text-[#666666]">
            View and download your complete giving history for tax purposes.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {years.slice(0, 4).map((year) => {
          const yearGifts = giftsByYear[Number(year)];
          const yearTotal = yearGifts.reduce((sum, g) => sum + g.amount, 0);
          const count = yearGifts.length;

          return (
            <Card key={year}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-[#666666] flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {year}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-[#1a1a1a]">
                  ${yearTotal.toLocaleString()}
                </p>
                <p className="text-xs text-[#666666]">{count} gifts</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* All Gifts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="font-['Cormorant_Garamond']">All Gifts</CardTitle>
          <CardDescription>
            Complete record of your gifts to Favor International
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GivingTable gifts={gifts} />
        </CardContent>
      </Card>

      {/* Tax Information */}
      <Card className="bg-[#f5f5f0]">
        <CardHeader>
          <CardTitle className="font-['Cormorant_Garamond']">Tax Information</CardTitle>
          <CardDescription>Important details for your tax records</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="font-medium text-[#1a1a1a]">Organization</p>
              <p className="text-sm text-[#666666]">Favor International, Inc.</p>
            </div>
            <div>
              <p className="font-medium text-[#1a1a1a]">Tax ID (EIN)</p>
              <p className="text-sm text-[#666666]">XX-XXXXXXX</p>
            </div>
            <div>
              <p className="font-medium text-[#1a1a1a]">Tax Classification</p>
              <p className="text-sm text-[#666666]">501(c)(3) Non-Profit Organization</p>
            </div>
            <div>
              <p className="font-medium text-[#1a1a1a]">Deductibility</p>
              <p className="text-sm text-[#666666]">All contributions are tax-deductible</p>
            </div>
          </div>
          <p className="text-xs text-[#666666]">
            Annual tax receipts are sent by January 31st of each year. If you need a duplicate
            receipt or have questions, please contact us at giving@favorinternational.org.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
