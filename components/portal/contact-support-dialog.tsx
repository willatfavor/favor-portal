"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, CheckCircle, Clock } from "lucide-react";
import type { SupportTicket } from "@/types";
import { toast } from "sonner";

interface ContactSupportDialogProps {
  trigger?: React.ReactNode;
}

export function ContactSupportDialog({ trigger }: ContactSupportDialogProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"form" | "history">("form");
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  async function loadTickets() {
    try {
      const response = await fetch("/api/support", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed");
      const payload = await response.json();
      const nextTickets = Array.isArray(payload.tickets) ? (payload.tickets as SupportTicket[]) : [];
      setTickets(nextTickets);
      setView(nextTickets.length > 0 ? "history" : "form");
    } catch {
      setTickets([]);
      setView("form");
    }
  }

  function handleOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) {
      loadTickets();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category || !subject || !message) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, subject, message }),
      });

      if (!response.ok) {
        throw new Error("Failed");
      }

      const payload = await response.json();
      const ticket = payload.ticket as SupportTicket;
      if (!ticket?.id) {
        throw new Error("Invalid response");
      }

      setTickets((prev) => [ticket, ...prev]);
      setCategory("");
      setSubject("");
      setMessage("");
      setView("history");
      toast.success("Support request submitted", {
        description: "We'll get back to you within 1-2 business days.",
      });
    } catch {
      toast.error("Unable to submit support request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="w-full">
            <MessageCircle className="mr-2 h-4 w-4" />
            Contact Support
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg glass-elevated border-0">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Partner Support</DialogTitle>
          <DialogDescription>Submit a request or view your support history.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 border-b border-[#c5ccc2]/20 pb-3">
          <Button
            variant={view === "form" ? "default" : "ghost"}
            size="sm"
            className={view === "form" ? "bg-[#2b4d24] hover:bg-[#1a3a15]" : ""}
            onClick={() => setView("form")}
          >
            New Request
          </Button>
          <Button
            variant={view === "history" ? "default" : "ghost"}
            size="sm"
            className={view === "history" ? "bg-[#2b4d24] hover:bg-[#1a3a15]" : ""}
            onClick={() => setView("history")}
          >
            History
            {tickets.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px]">
                {tickets.length}
              </Badge>
            )}
          </Button>
        </div>

        {view === "form" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
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
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief description of your request"
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us more about how we can help..."
                rows={4}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-[#2b4d24] hover:bg-[#1a3a15]"
              disabled={!category || !subject || !message || submitting}
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </form>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {tickets.length === 0 ? (
              <div className="py-8 text-center">
                <MessageCircle className="mx-auto h-8 w-8 text-[#c5ccc2]" />
                <p className="mt-2 text-sm text-[#666666]">No support requests yet.</p>
              </div>
            ) : (
              tickets.map((ticket) => (
                <div key={ticket.id} className="rounded-lg glass-inset p-4">
                  <div className="flex items-start justify-between">
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
                  <p className="mt-2 text-xs text-[#666666] line-clamp-2">{ticket.message}</p>
                  <p className="mt-2 text-[10px] text-[#999999]">
                    {new Date(ticket.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
