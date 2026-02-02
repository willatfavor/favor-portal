"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Calendar, Heart } from "lucide-react";

interface GivingSummaryProps {
  totalGiven: number;
  ytdGiven: number;
}

export function GivingSummary({ totalGiven, ytdGiven }: GivingSummaryProps) {
  // Calculate monthly average based on YTD
  const currentMonth = new Date().getMonth() + 1;
  const monthlyAverage = currentMonth > 0 ? ytdGiven / currentMonth : 0;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-[#666666]">
            Lifetime Giving
          </CardTitle>
          <Heart className="h-4 w-4 text-[#2b4d24]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-[#1a1a1a]">
            ${totalGiven.toLocaleString()}
          </div>
          <p className="text-xs text-[#666666]">
            Total contributions to date
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-[#666666]">
            Year to Date
          </CardTitle>
          <Calendar className="h-4 w-4 text-[#2b4d24]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-[#1a1a1a]">
            ${ytdGiven.toLocaleString()}
          </div>
          <p className="text-xs text-[#666666]">
            {new Date().getFullYear()} giving total
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-[#666666]">
            Monthly Average
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-[#2b4d24]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-[#1a1a1a]">
            ${Math.round(monthlyAverage).toLocaleString()}
          </div>
          <p className="text-xs text-[#666666]">
            Average per month this year
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
