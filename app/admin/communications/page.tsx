"use client";

import { useEffect, useState } from "react";
import { CommunicationTemplate } from "@/types";
import { getMockTemplates, setMockTemplates } from "@/lib/mock-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Mail, MessageCircle, Send } from "lucide-react";

const CHANNEL_ICON: Record<string, React.ElementType> = {
  email: Mail,
  sms: MessageCircle,
  direct_mail: Send,
};

export default function AdminCommunicationsPage() {
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [editing, setEditing] = useState<CommunicationTemplate | null>(null);

  useEffect(() => {
    setTemplates(getMockTemplates());
  }, []);

  function saveTemplate() {
    if (!editing) return;
    const next = templates.map((t) => (t.id === editing.id ? { ...editing, updatedAt: new Date().toISOString() } : t));
    setTemplates(next);
    setMockTemplates(next);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl text-[#1a1a1a]">Communications</h1>
        <p className="text-sm text-[#666666]">Review and edit email, SMS, and direct mail templates.</p>
      </div>

      <div className="grid gap-4">
        {templates.map((template) => {
          const Icon = CHANNEL_ICON[template.channel] ?? Mail;
          return (
            <Card key={template.id} className="glass-pane">
              <CardContent className="p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2b4d24]/10">
                    <Icon className="h-4 w-4 text-[#2b4d24]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1a1a1a]">{template.name}</p>
                    <p className="text-xs text-[#999999]">{template.subject ?? "No subject"}</p>
                    <div className="mt-2 flex gap-2">
                      <Badge variant="outline" className="text-[10px] text-[#8b957b]">
                        {template.channel.replace("_", " ")}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {template.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => setEditing(template)}>
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg glass-elevated border-0">
                    <DialogHeader>
                      <DialogTitle className="font-serif text-xl">Edit Template</DialogTitle>
                    </DialogHeader>
                    {editing && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input
                            value={editing.name}
                            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                          />
                        </div>
                        {editing.channel === "email" && (
                          <div className="space-y-2">
                            <Label>Subject</Label>
                            <Input
                              value={editing.subject ?? ""}
                              onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                            />
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label>Content</Label>
                          <Input
                            value={editing.content}
                            onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                          />
                        </div>
                        <Button className="w-full bg-[#2b4d24] hover:bg-[#1a3a15]" onClick={saveTemplate}>
                          Save Template
                        </Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
