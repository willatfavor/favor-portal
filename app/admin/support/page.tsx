"use client";

import { useEffect, useState } from "react";
import { SupportTicket } from "@/lib/portal-mock-data";
import { getSupportTickets, updateSupportTicketStatus } from "@/lib/local-storage";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  useEffect(() => {
    setTickets(getSupportTickets());
  }, []);

  function updateStatus(id: string, status: SupportTicket["status"]) {
    const next = updateSupportTicketStatus(id, status);
    setTickets(next);
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
              <CardContent className="p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
