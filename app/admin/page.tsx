"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getMockUsers,
  getMockCourses,
  getMockContent,
  getMockGifts,
} from "@/lib/mock-store";
import { getSupportTickets } from "@/lib/local-storage";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, Users, BookOpen, FileText, LifeBuoy } from "lucide-react";

export default function AdminOverviewPage() {
  const [stats, setStats] = useState({
    users: 0,
    courses: 0,
    content: 0,
    totalGiving: 0,
    openTickets: 0,
  });

  useEffect(() => {
    const users = getMockUsers();
    const courses = getMockCourses();
    const content = getMockContent();
    const gifts = getMockGifts();
    const tickets = getSupportTickets();
    setStats({
      users: users.length,
      courses: courses.length,
      content: content.length,
      totalGiving: gifts.reduce((sum, g) => sum + g.amount, 0),
      openTickets: tickets.filter((t) => t.status !== "resolved").length,
    });
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-[#1a1a1a]">Admin Overview</h1>
          <p className="text-sm text-[#666666]">
            Monitor portal activity, content, and partner engagement in mock mode.
          </p>
        </div>
        <Badge variant="outline" className="border-[#2b4d24] text-[#2b4d24]">
          Dev Environment
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        {[
          { label: "Partners", value: stats.users, icon: Users },
          { label: "Courses", value: stats.courses, icon: BookOpen },
          { label: "Content Items", value: stats.content, icon: FileText },
          { label: "Total Giving", value: formatCurrency(stats.totalGiving), icon: TrendingUp },
          { label: "Open Tickets", value: stats.openTickets, icon: LifeBuoy },
        ].map((stat) => (
          <Card key={stat.label} className="glass-pane">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-[#999999] flex items-center gap-2">
                <stat.icon className="h-3.5 w-3.5 text-[#2b4d24]" />
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold text-[#1a1a1a]">
              {stat.value}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              "New ambassador onboarded in Denver",
              "Q4 Impact Report published",
              "Course module updated in Africa Programs",
              "Two support tickets marked resolved",
            ].map((item) => (
              <div key={item} className="rounded-xl glass-inset p-3 text-sm text-[#666666]">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              Create a new course
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Publish a partner update
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Review support tickets
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
