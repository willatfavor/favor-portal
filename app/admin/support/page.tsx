"use client";

import { useEffect, useState } from "react";
import { SupportTicket } from "@/types";
import { getSupportTickets, updateSupportTicketStatus, saveSupportTickets } from "@/lib/local-storage";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LifeBuoy } from "lucide-react";

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setTickets(getSupportTickets());
  }, []);

  useEffect(() => {
    function handleSupport() {
      setTickets(getSupportTickets());
    }
    window.addEventListener("favor:support", handleSupport);
    return () => window.removeEventListener("favor:support", handleSupport);
  }, []);

  function updateStatus(id: string, status: SupportTicket["status"]) {
    const next = updateSupportTicketStatus(id, status);
    setTickets(next);
  }

  function sendReply(ticket: SupportTicket) {
    const message = replyDrafts[ticket.id]?.trim();
    if (!message) return;
    const updated: SupportTicket[] = tickets.map((t) => {
      if (t.id !== ticket.id) return t;
      const messages = t.messages ?? [];
      return {
        ...t,
        status: t.status === "resolved" ? t.status : "in_progress",
        messages: [
          ...messages,
          {
            id: `msg-${Date.now()}`,
            sender: "staff" as const,
            message,
            createdAt: new Date().toISOString(),
          },
        ],
      };
    });
    saveSupportTickets(updated);
    setTickets(updated);
    setReplyDrafts((prev) => ({ ...prev, [ticket.id]: "" }));
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl text-[#1a1a1a]">Support Desk</h1>
        <p className="text-sm text-[#666666]">Review partner requests and update ticket status.</p>
      </div>

      {tickets.length === 0 ? (
        <Card className="glass-pane">
          <CardContent className="p-6 text-center">
            <LifeBuoy className="mx-auto h-8 w-8 text-[#c5ccc2]" />
            <p className="mt-2 text-sm text-[#666666]">No support tickets yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tickets.map((ticket) => (
            <Card key={ticket.id} className="glass-pane">
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#1a1a1a]">{ticket.subject}</p>
                    <p className="text-xs text-[#999999]">{ticket.message}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-[10px] text-[#8b957b]">
                        {ticket.category}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </Badge>
                      {ticket.requesterName && (
                        <Badge variant="secondary" className="text-[10px]">
                          {ticket.requesterName}
                        </Badge>
                      )}
                      {ticket.requesterEmail && (
                        <Badge variant="secondary" className="text-[10px]">
                          {ticket.requesterEmail}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Select
                    value={ticket.status}
                    onValueChange={(value) => updateStatus(ticket.id, value as SupportTicket["status"])}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(ticket.messages?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-[#8b957b]">Thread</p>
                    <div className="space-y-2">
                      {ticket.messages?.map((msg) => (
                        <div
                          key={msg.id}
                          className={`rounded-lg px-3 py-2 text-xs ${
                            msg.sender === "staff"
                              ? "bg-[#2b4d24]/10 text-[#1a1a1a]"
                              : "bg-white/70 text-[#1a1a1a]"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-[#999999]">
                            <span>{msg.sender === "staff" ? "Staff" : "Partner"}</span>
                            <span>{new Date(msg.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="mt-1">{msg.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Textarea
                    placeholder="Reply to this request..."
                    value={replyDrafts[ticket.id] ?? ""}
                    onChange={(e) =>
                      setReplyDrafts((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                    }
                  />
                  <Button
                    className="bg-[#2b4d24] hover:bg-[#1a3a15]"
                    onClick={() => sendReply(ticket)}
                  >
                    Send Reply
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
