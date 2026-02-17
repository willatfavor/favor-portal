"use client";

import { type FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CalendarClock, CheckCircle, Clock, FileText, LifeBuoy, Lock, MessageCircle } from "lucide-react";
import type { SupportTicket } from "@/types";
import { PortalPageSkeleton } from "@/components/portal/portal-page-skeleton";

type SupportCategory = "giving" | "account" | "courses" | "technical" | "other";

function getTopicPreset(topic: string | null, contentTitle: string | null) {
  switch (topic) {
    case "strategic-call":
      return {
        category: "other" as SupportCategory,
        subject: "Request strategic call with RDD",
        message:
          "I would like to schedule a strategic call with my RDD to review stewardship priorities.",
      };
    case "content-access":
      return {
        category: "courses" as SupportCategory,
        subject: `Request access: ${contentTitle ?? "Locked content item"}`,
        message:
          "Please review my access level for this content item and let me know if it can be unlocked.",
      };
    case "account-help":
      return {
        category: "account" as SupportCategory,
        subject: "Account support request",
        message: "I need help with my profile, sign-in, or account settings.",
      };
    case "technical-issue":
      return {
        category: "technical" as SupportCategory,
        subject: "Technical issue report",
        message: "I encountered a technical issue in the portal. Steps to reproduce:",
      };
    default:
      return {
        category: undefined,
        subject: "",
        message: "",
      };
  }
}

export default function SupportPage() {
  return (
    <Suspense fallback={<PortalPageSkeleton />}>
      <SupportPageContent />
    </Suspense>
  );
}

function SupportPageContent() {
  const searchParams = useSearchParams();
  const topic = searchParams.get("topic");
  const contentTitle = searchParams.get("contentTitle");
  const preset = useMemo(() => getTopicPreset(topic, contentTitle), [topic, contentTitle]);

  const [category, setCategory] = useState<SupportCategory | "">("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (preset.category && !category) setCategory(preset.category);
    if (preset.subject && !subject) setSubject(preset.subject);
    if (preset.message && !message) setMessage(preset.message);
  }, [preset, category, subject, message]);

  useEffect(() => {
    let isMounted = true;
    async function loadTickets() {
      try {
        const response = await fetch("/api/support", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed");
        const payload = await response.json();
        if (!isMounted) return;
        setTickets(Array.isArray(payload.tickets) ? (payload.tickets as SupportTicket[]) : []);
      } catch {
        if (isMounted) setTickets([]);
      } finally {
        if (isMounted) setLoadingHistory(false);
      }
    }
    void loadTickets();
    return () => {
      isMounted = false;
    };
  }, []);

  async function submitRequest(event: FormEvent) {
    event.preventDefault();
    if (!category || !subject.trim() || !message.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          subject: subject.trim(),
          message: message.trim(),
        }),
      });
      if (!response.ok) throw new Error("Failed");

      const payload = await response.json();
      const ticket = payload.ticket as SupportTicket;
      if (!ticket?.id) throw new Error("Invalid");

      setTickets((current) => [ticket, ...current]);
      setSubject("");
      setMessage("");
      toast.success("Support request submitted", {
        description: "We'll follow up within 1-2 business days.",
      });
    } catch {
      toast.error("Unable to submit support request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <nav className="flex items-center gap-1 text-xs text-[#999999]">
          <Link href="/dashboard" className="hover:text-[#666666]">
            Dashboard
          </Link>
          <span>/</span>
          <span className="font-medium text-[#1a1a1a]">Support Center</span>
        </nav>
        <h1 className="font-serif text-3xl font-semibold text-[#1a1a1a]">Support Center</h1>
        <p className="max-w-2xl text-sm text-[#666666]">
          Submit requests, track support history, and get routed to the right team quickly.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-pane">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2 text-[#2b4d24]">
              <CalendarClock className="h-4 w-4" />
              <p className="text-sm font-medium">Strategic Call</p>
            </div>
            <p className="text-xs text-[#666666]">Request a planning call with your assigned RDD.</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const next = getTopicPreset("strategic-call", null);
                setCategory(next.category ?? "");
                setSubject(next.subject);
                setMessage(next.message);
              }}
            >
              Use This Request
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-pane">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2 text-[#2b4d24]">
              <Lock className="h-4 w-4" />
              <p className="text-sm font-medium">Content Access</p>
            </div>
            <p className="text-xs text-[#666666]">Request access to locked reports, courses, or resources.</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const next = getTopicPreset("content-access", contentTitle);
                setCategory(next.category ?? "");
                setSubject(next.subject);
                setMessage(next.message);
              }}
            >
              Request Access
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-pane">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2 text-[#2b4d24]">
              <LifeBuoy className="h-4 w-4" />
              <p className="text-sm font-medium">Technical Support</p>
            </div>
            <p className="text-xs text-[#666666]">Report bugs, broken links, or anything not working as expected.</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const next = getTopicPreset("technical-issue", null);
                setCategory(next.category ?? "");
                setSubject(next.subject);
                setMessage(next.message);
              }}
            >
              Report Issue
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="request" className="space-y-4">
        <TabsList>
          <TabsTrigger value="request">New Request</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="request">
          <Card className="glass-pane">
            <CardHeader>
              <CardTitle className="font-serif text-xl">Submit A Request</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={(value) => setCategory(value as SupportCategory)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="giving">Giving & Receipts</SelectItem>
                      <SelectItem value="account">Account & Login</SelectItem>
                      <SelectItem value="courses">Courses & Content</SelectItem>
                      <SelectItem value="technical">Technical Issue</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="Brief summary of your request"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={6}
                    placeholder="Add the details our team needs to help you quickly."
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#2b4d24] hover:bg-[#1a3a15]"
                  disabled={!category || !subject.trim() || !message.trim() || submitting}
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="glass-pane">
            <CardHeader>
              <CardTitle className="font-serif text-xl">Support History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingHistory ? (
                <p className="text-sm text-[#666666]">Loading support requests...</p>
              ) : tickets.length === 0 ? (
                <p className="text-sm text-[#666666]">No support requests yet.</p>
              ) : (
                tickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-lg border border-[#c5ccc2]/40 bg-white/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#1a1a1a]">{ticket.subject}</p>
                        <p className="text-xs text-[#666666]">{ticket.category}</p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={
                          ticket.status === "open"
                            ? "bg-[#e1a730]/10 text-[#a36d4c]"
                            : ticket.status === "resolved"
                              ? "bg-[#2b4d24]/10 text-[#2b4d24]"
                              : ""
                        }
                      >
                        {ticket.status === "open" && <Clock className="mr-1 h-3 w-3" />}
                        {ticket.status === "resolved" && <CheckCircle className="mr-1 h-3 w-3" />}
                        {ticket.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-[#666666]">{ticket.message}</p>
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-[#999999]">
                      <MessageCircle className="h-3 w-3" />
                      <span>{new Date(ticket.createdAt).toLocaleString()}</span>
                      {ticket.messages?.length ? (
                        <span className="inline-flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {ticket.messages.length} message(s)
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
