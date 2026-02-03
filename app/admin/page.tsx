"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getMockUsers,
  getMockCourses,
  getMockContent,
  getMockGifts,
  getMockActivity,
} from "@/lib/mock-store";
import { getSupportTickets } from "@/lib/local-storage";
import { formatCurrency } from "@/lib/utils";
import { ActivityEvent, Gift, SupportTicket, User } from "@/types";
import {
  TrendingUp,
  Users,
  BookOpen,
  FileText,
  LifeBuoy,
  Filter,
  ClipboardCheck,
  Sparkles,
  Shield,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { GIVING_TIERS } from "@/lib/constants";

const USER_TYPES = [
  "all",
  "individual",
  "major_donor",
  "church",
  "foundation",
  "daf",
  "ambassador",
  "volunteer",
];

const TIER_PRESETS = [
  { label: "Partner", value: 500 },
  { label: "Silver", value: 1500 },
  { label: "Gold", value: 7500 },
  { label: "Platinum", value: 15000 },
];

function getMonthKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 7);
}

function describeActivity(event: ActivityEvent, user?: User | null) {
  const name = user ? `${user.firstName} ${user.lastName}` : "A partner";
  switch (event.type) {
    case "gift_created":
      return `${name} created a dashboard gift`;
    case "course_completed":
      return `${name} completed a course module`;
    case "course_progress":
      return `${name} progressed in a course`;
    case "content_viewed":
      return `${name} viewed a content item`;
    case "support_ticket":
      return `${name} submitted a support request`;
    case "profile_updated":
      return `${name} updated profile details`;
    case "login":
      return `${name} signed in`;
    default:
      return `${name} activity recorded`;
  }
}

export default function AdminOverviewPage() {
  const { user: activeUser, isDev, setDevUser, updateDevUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [switchUsers, setSwitchUsers] = useState<User[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [monthFilter, setMonthFilter] = useState("all");
  const [userTypeFilter, setUserTypeFilter] = useState("all");
  const [coursesCount, setCoursesCount] = useState(0);
  const [contentCount, setContentCount] = useState(0);

  useEffect(() => {
    setUsers(getMockUsers());
    setSwitchUsers(getMockUsers());
    setActivity(getMockActivity());
    setTickets(getSupportTickets());
    setGifts(getMockGifts());
    setCoursesCount(getMockCourses().length);
    setContentCount(getMockContent().length);
  }, []);

  useEffect(() => {
    function handleActivity() {
      setActivity(getMockActivity());
    }
    function handleGifts() {
      setGifts(getMockGifts());
    }
    function handleSupport() {
      setTickets(getSupportTickets());
    }
    window.addEventListener("favor:activity", handleActivity);
    window.addEventListener("favor:gifts", handleGifts);
    window.addEventListener("favor:support", handleSupport);
    return () => {
      window.removeEventListener("favor:activity", handleActivity);
      window.removeEventListener("favor:gifts", handleGifts);
      window.removeEventListener("favor:support", handleSupport);
    };
  }, []);

  const monthOptions = useMemo(() => {
    const dates = [
      ...gifts.map((g) => g.date),
      ...activity.map((a) => a.createdAt),
      ...tickets.map((t) => t.createdAt),
    ]
      .map((date) => getMonthKey(date))
      .filter(Boolean);
    const unique = Array.from(new Set(dates));
    unique.sort((a, b) => (a > b ? -1 : 1));
    return ["all", ...unique];
  }, [activity, tickets]);

  const filteredUsers = useMemo(() => {
    if (userTypeFilter === "all") return users;
    return users.filter((u) => u.constituentType === userTypeFilter);
  }, [users, userTypeFilter]);

  const tierKey = useMemo(() => {
    if (!activeUser) return "Partner";
    if (activeUser.lifetimeGivingTotal >= GIVING_TIERS.PLATINUM.min) return "Platinum";
    if (activeUser.lifetimeGivingTotal >= GIVING_TIERS.GOLD.min) return "Gold";
    if (activeUser.lifetimeGivingTotal >= GIVING_TIERS.SILVER.min) return "Silver";
    return "Partner";
  }, [activeUser]);

  const userIdSet = useMemo(
    () => new Set(filteredUsers.map((u) => u.id)),
    [filteredUsers]
  );

  const portalGifts = useMemo(() => {
    const portalOnly = gifts.filter((g) => g.source === "portal");
    return portalOnly.filter((g) => {
      const matchesUser = userTypeFilter === "all" || userIdSet.has(g.userId);
      const matchesMonth =
        monthFilter === "all" || getMonthKey(g.date) === monthFilter;
      return matchesUser && matchesMonth;
    });
  }, [gifts, monthFilter, userTypeFilter, userIdSet]);

  const filteredActivity = useMemo(() => {
    return activity.filter((event) => {
      const matchesUser = userTypeFilter === "all" || userIdSet.has(event.userId);
      const matchesMonth =
        monthFilter === "all" || getMonthKey(event.createdAt) === monthFilter;
      return matchesUser && matchesMonth;
    });
  }, [activity, monthFilter, userTypeFilter, userIdSet]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesMonth =
        monthFilter === "all" || getMonthKey(ticket.createdAt) === monthFilter;
      if (userTypeFilter === "all") return matchesMonth;
      const matchedUser = users.find((u) => u.email === ticket.requesterEmail);
      return matchesMonth && matchedUser?.constituentType === userTypeFilter;
    });
  }, [tickets, monthFilter, userTypeFilter, users]);

  const portalGivingTotal = portalGifts.reduce((sum, g) => sum + g.amount, 0);
  const completions = filteredActivity.filter((a) => a.type === "course_completed");
  const contentViews = filteredActivity.filter((a) => a.type === "content_viewed");

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-[#1a1a1a]">Admin Overview</h1>
          <p className="text-sm text-[#666666]">
            Monitor portal actions, engagement, and internal activity (mock mode).
          </p>
        </div>
        <Badge variant="outline" className="border-[#2b4d24] text-[#2b4d24]">
          Dev Environment
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-[#8b957b]">
          <Filter className="h-3.5 w-3.5" /> Filters
        </div>
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((month) => (
              <SelectItem key={month} value={month}>
                {month === "all" ? "All months" : month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="User type" />
          </SelectTrigger>
          <SelectContent>
            {USER_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type === "all" ? "All user types" : type.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-[#999999]">
          Showing {filteredUsers.length} partners
        </span>
      </div>

      {isDev && activeUser && (
        <Card className="glass-pane">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[#1a1a1a]">
              <Shield className="h-4 w-4 text-[#2b4d24]" /> QA Role Switcher
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl glass-inset p-4">
              <p className="text-xs text-[#999999]">Active User</p>
              <p className="text-sm font-medium text-[#1a1a1a]">
                {activeUser.firstName} {activeUser.lastName}
              </p>
              <p className="text-xs text-[#8b957b]">{tierKey}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <p className="text-xs font-medium text-[#8b957b]">Switch User</p>
                <Select
                  value={activeUser.id}
                  onValueChange={(value) => {
                    setDevUser?.(value);
                    setSwitchUsers(getMockUsers());
                    setUsers(getMockUsers());
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {switchUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} ({u.constituentType.replace("_", " ")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-[#8b957b]">Constituent Type</p>
                <Select
                  value={activeUser.constituentType}
                  onValueChange={(value) => {
                    updateDevUser?.({ constituentType: value as User["constituentType"] });
                    setUsers(getMockUsers());
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_TYPES.filter((type) => type !== "all").map((type) => (
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
                    const match = TIER_PRESETS.find((t) => t.label === value);
                    updateDevUser?.({ lifetimeGivingTotal: match?.value ?? 0 });
                    setUsers(getMockUsers());
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tier" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIER_PRESETS.map((tier) => (
                      <SelectItem key={tier.label} value={tier.label}>
                        {tier.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-5">
        {[
          { label: "Partners", value: filteredUsers.length, icon: Users },
          { label: "Portal Giving", value: formatCurrency(portalGivingTotal), icon: TrendingUp },
          { label: "Courses Completed", value: completions.length, icon: ClipboardCheck },
          { label: "Content Views", value: contentViews.length, icon: Sparkles },
          { label: "Open Tickets", value: filteredTickets.filter((t) => t.status !== "resolved").length, icon: LifeBuoy },
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
            {filteredActivity.length === 0 ? (
              <div className="rounded-xl glass-inset p-3 text-sm text-[#666666]">
                No activity logged for the selected filters.
              </div>
            ) : (
              filteredActivity.slice(0, 6).map((event) => {
                const user = users.find((u) => u.id === event.userId) ?? null;
                return (
                  <div key={event.id} className="rounded-xl glass-inset p-3 text-sm text-[#666666]">
                    <div className="flex items-center justify-between">
                      <span>{describeActivity(event, user)}</span>
                      <span className="text-[10px] text-[#999999]">
                        {new Date(event.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/admin/courses">Create or edit courses</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/admin/content">Publish partner updates</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/admin/support">Review support tickets</Link>
            </Button>
            <div className="text-xs text-[#999999]">
              Courses: {coursesCount} - Content: {contentCount}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
