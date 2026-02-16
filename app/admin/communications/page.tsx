"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CommunicationTemplate } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Mail,
  MessageSquare,
  Mailbox,
  PlusCircle,
  Search,
  Pencil,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Send,
  BarChart3,
  BookOpen,
  AlertCircle,
  Check,
} from "lucide-react";
import { toast } from "sonner";

type Channel = CommunicationTemplate["channel"];
type TemplateStatus = CommunicationTemplate["status"];

const CHANNELS: { label: string; value: Channel; icon: typeof Mail }[] = [
  { label: "Email", value: "email", icon: Mail },
  { label: "SMS", value: "sms", icon: MessageSquare },
  { label: "Direct Mail", value: "direct_mail", icon: Mailbox },
];

const EMPTY_TEMPLATE: Partial<CommunicationTemplate> = {
  channel: "email",
  name: "",
  subject: "",
  content: "",
  status: "draft",
};

const VARIABLE_HINTS = [
  "{{firstName}}",
  "{{lastName}}",
  "{{email}}",
  "{{amount}}",
  "{{date}}",
  "{{designation}}",
  "{{constituentType}}",
];

function channelIcon(ch: Channel) {
  switch (ch) {
    case "email":
      return Mail;
    case "sms":
      return MessageSquare;
    case "direct_mail":
      return Mailbox;
  }
}

function channelColor(ch: Channel): string {
  switch (ch) {
    case "email":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "sms":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "direct_mail":
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

export default function AdminCommunicationsPage() {
  const [templates, setTemplatesState] = useState<CommunicationTemplate[]>([]);
  const [query, setQuery] = useState("");
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [newTemplate, setNewTemplate] =
    useState<Partial<CommunicationTemplate>>(EMPTY_TEMPLATE);
  const [editingTemplate, setEditingTemplate] =
    useState<CommunicationTemplate | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] =
    useState<CommunicationTemplate | null>(null);
  const [testSentId, setTestSentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  const [sendLog, setSendLog] = useState<
    { id: string; templateId: string; templateName: string; channel: Channel; sentAt: string }[]
  >([]);
  const sendLogIdRef = useRef(0);

  const loadCommunications = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/communications", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed");
      const payload = await response.json();
      setTemplatesState(Array.isArray(payload.templates) ? payload.templates : []);
      setSendLog(Array.isArray(payload.sendLog) ? payload.sendLog : []);
    } catch {
      toast.error("Unable to load communications");
    }
  }, []);

  useEffect(() => {
    loadCommunications();
  }, [loadCommunications]);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      const matchQuery =
        t.name.toLowerCase().includes(query.toLowerCase()) ||
        t.content.toLowerCase().includes(query.toLowerCase()) ||
        (t.subject ?? "").toLowerCase().includes(query.toLowerCase());
      const matchChannel = filterChannel === "all" || t.channel === filterChannel;
      const matchStatus = filterStatus === "all" || t.status === filterStatus;
      return matchQuery && matchChannel && matchStatus;
    });
  }, [templates, query, filterChannel, filterStatus]);

  // Stats
  const totalTemplates = templates.length;
  const activeCount = templates.filter((t) => t.status === "active").length;
  const draftCount = templates.filter((t) => t.status === "draft").length;
  const channelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    templates.forEach((t) => {
      counts[t.channel] = (counts[t.channel] || 0) + 1;
    });
    return counts;
  }, [templates]);

  async function addTemplate() {
    if (!newTemplate.name) return;
    try {
      const response = await fetch("/api/admin/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: newTemplate.channel ?? "email",
          name: newTemplate.name,
          subject: newTemplate.subject,
          content: newTemplate.content ?? "",
          status: newTemplate.status ?? "draft",
        }),
      });
      if (!response.ok) throw new Error("Failed");
      const payload = await response.json();
      const created = payload.template as CommunicationTemplate;
      setTemplatesState((prev) => [created, ...prev]);
      setNewTemplate(EMPTY_TEMPLATE);
      setActiveTab("list");
      toast.success("Template created");
    } catch {
      toast.error("Unable to create template");
    }
  }

  async function updateTemplate() {
    if (!editingTemplate) return;
    try {
      const response = await fetch(`/api/admin/communications/${editingTemplate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingTemplate),
      });
      if (!response.ok) throw new Error("Failed");
      const payload = await response.json();
      const updated = payload.template as CommunicationTemplate;
      setTemplatesState((prev) => prev.map((template) => (template.id === updated.id ? updated : template)));
      setEditingTemplate(null);
      toast.success("Template updated");
    } catch {
      toast.error("Unable to update template");
    }
  }

  async function deleteTemplate(id: string) {
    try {
      const response = await fetch(`/api/admin/communications/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed");
      setTemplatesState((prev) => prev.filter((template) => template.id !== id));
      setDeleteConfirmId(null);
      toast.success("Template deleted");
    } catch {
      toast.error("Unable to delete template");
    }
  }

  function duplicateTemplate(t: CommunicationTemplate) {
    setNewTemplate({
      ...t,
      id: undefined,
      name: `${t.name} (Copy)`,
      status: "draft",
    });
    setActiveTab("create");
  }

  async function toggleStatus(id: string) {
    const template = templates.find((entry) => entry.id === id);
    if (!template) return;
    const status = (template.status === "active" ? "draft" : "active") as TemplateStatus;
    try {
      const response = await fetch(`/api/admin/communications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed");
      const payload = await response.json();
      const updated = payload.template as CommunicationTemplate;
      setTemplatesState((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
    } catch {
      toast.error("Unable to update template status");
    }
  }

  const handleTestSend = useCallback(async (template: CommunicationTemplate) => {
    try {
      const response = await fetch("/api/admin/communications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: template.id }),
      });
      if (!response.ok) throw new Error("Failed");
      const entry = {
        id: `send-${crypto.randomUUID()}`,
        templateId: template.id,
        templateName: template.name,
        channel: template.channel,
        sentAt: new Date().toISOString(),
      };
      setSendLog((prev) => [entry, ...prev]);
      setTestSentId(template.id);
      setTimeout(() => setTestSentId(null), 2000);
      toast.success("Test send logged");
    } catch {
      toast.error("Unable to send test message");
    }
  }, []);

  function renderPreview(t: CommunicationTemplate) {
    const sampleData: Record<string, string> = {
      "{{firstName}}": "Emma",
      "{{lastName}}": "Carter",
      "{{email}}": "emma@favor.local",
      "{{amount}}": "$100.00",
      "{{date}}": new Date().toLocaleDateString(),
      "{{designation}}": "Clean Water Initiative",
      "{{constituentType}}": "Partner",
    };
    let text = t.content;
    Object.entries(sampleData).forEach(([key, val]) => {
      text = text.replaceAll(key, val);
    });
    return text;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-[#1a1a1a]">Communications</h1>
          <p className="text-sm text-[#666666]">
            Manage email, SMS, and direct mail templates.
          </p>
        </div>
        <Button
          className="bg-[#2b4d24] hover:bg-[#1a3a15]"
          onClick={() => setActiveTab("create")}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> New Template
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          {
            label: "Total Templates",
            value: totalTemplates,
            icon: BookOpen,
            sub: "All channels",
          },
          {
            label: "Active",
            value: activeCount,
            icon: Check,
            sub: "Ready to send",
          },
          { label: "Drafts", value: draftCount, icon: Eye, sub: "In progress" },
          {
            label: "Channels",
            value: `${channelCounts["email"] || 0} / ${channelCounts["sms"] || 0} / ${channelCounts["direct_mail"] || 0}`,
            icon: BarChart3,
            sub: "Email / SMS / Mail",
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2b4d24]/5">
                <stat.icon className="h-5 w-5 text-[#2b4d24]" />
              </div>
              <div>
                <p className="text-xs text-[#999999]">{stat.label}</p>
                <p className="text-xl font-semibold text-[#1a1a1a]">
                  {stat.value}
                </p>
                <p className="text-[10px] text-[#999999]">{stat.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">All Templates</TabsTrigger>
          <TabsTrigger value="create">Create New</TabsTrigger>
          <TabsTrigger value="log">Send Log</TabsTrigger>
        </TabsList>

        {/* ── List Tab ──────────────────── */}
        <TabsContent value="list" className="space-y-6 mt-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999999]" />
              <Input
                placeholder="Search templates..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterChannel} onValueChange={setFilterChannel}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                {CHANNELS.map((ch) => (
                  <SelectItem key={ch.value} value={ch.value}>
                    {ch.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-[#999999]">
            Showing {filtered.length} of {templates.length} templates
          </p>

          {/* Template list */}
          <div className="space-y-3">
            {filtered.map((tmpl) => {
              const Icon = channelIcon(tmpl.channel);
              return (
                <Card key={tmpl.id} className="glass-pane">
                  <CardContent className="p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Icon className="h-4 w-4 text-[#2b4d24] flex-shrink-0" />
                        <p className="text-sm font-medium text-[#1a1a1a]">
                          {tmpl.name}
                        </p>
                      </div>
                      {tmpl.subject && (
                        <p className="text-xs text-[#999999] mt-0.5">
                          Subject: {tmpl.subject}
                        </p>
                      )}
                      <p className="text-xs text-[#666666] mt-1 line-clamp-1">
                        {tmpl.content}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge
                          className={`text-[10px] border ${channelColor(tmpl.channel)}`}
                        >
                          {tmpl.channel.replace("_", " ")}
                        </Badge>
                        <Badge
                          variant={tmpl.status === "active" ? "default" : "outline"}
                          className={
                            tmpl.status === "active"
                              ? "text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200"
                              : "text-[10px] text-[#999999]"
                          }
                        >
                          {tmpl.status === "active" ? "Active" : "Draft"}
                        </Badge>
                        <span className="text-[10px] text-[#999999]">
                          Updated{" "}
                          {new Date(tmpl.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewTemplate(tmpl)}
                        title="Preview"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestSend(tmpl)}
                        title="Test Send"
                        className={
                          testSentId === tmpl.id
                            ? "text-emerald-500 border-emerald-300"
                            : ""
                        }
                      >
                        {testSentId === tmpl.id ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleStatus(tmpl.id)}
                        title={
                          tmpl.status === "active" ? "Deactivate" : "Activate"
                        }
                      >
                        {tmpl.status === "active" ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingTemplate(tmpl)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => duplicateTemplate(tmpl)}
                        title="Duplicate"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteConfirmId(tmpl.id)}
                        className="text-red-500 hover:text-red-600 hover:border-red-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-2xl glass-subtle border-dashed px-6 py-16 text-center">
                <Mail className="h-7 w-7 text-[#8b957b] mb-3" />
                <p className="font-serif text-lg text-[#1a1a1a]">
                  No templates found
                </p>
                <p className="text-sm text-[#666666]">
                  Try adjusting your filters or create a new template.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Create Tab ──────────────────── */}
        <TabsContent value="create" className="mt-6">
          <Card className="glass-pane">
            <CardContent className="p-6 space-y-5">
              <h2 className="font-serif text-xl text-[#1a1a1a]">
                Create Template
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={newTemplate.name ?? ""}
                    onChange={(e) =>
                      setNewTemplate({ ...newTemplate, name: e.target.value })
                    }
                    placeholder="Template name..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Channel</Label>
                  <Select
                    value={newTemplate.channel}
                    onValueChange={(value) =>
                      setNewTemplate({
                        ...newTemplate,
                        channel: value as Channel,
                        subject:
                          value === "email" ? newTemplate.subject : undefined,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {CHANNELS.map((ch) => (
                        <SelectItem key={ch.value} value={ch.value}>
                          {ch.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={newTemplate.status}
                    onValueChange={(value) =>
                      setNewTemplate({
                        ...newTemplate,
                        status: value as TemplateStatus,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {newTemplate.channel === "email" && (
                <div className="space-y-2">
                  <Label>Subject Line</Label>
                  <Input
                    value={newTemplate.subject ?? ""}
                    onChange={(e) =>
                      setNewTemplate({
                        ...newTemplate,
                        subject: e.target.value,
                      })
                    }
                    placeholder="Email subject line..."
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={newTemplate.content ?? ""}
                  onChange={(e) =>
                    setNewTemplate({
                      ...newTemplate,
                      content: e.target.value,
                    })
                  }
                  rows={8}
                  placeholder="Template content with {{variables}}..."
                />
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="text-[10px] text-[#999999]">
                    Available variables:
                  </span>
                  {VARIABLE_HINTS.map((v) => (
                    <button
                      key={v}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-[#FAF9F6] border border-[#e5e5e0] text-[#666666] hover:bg-[#2b4d24]/5 hover:text-[#2b4d24] transition-colors"
                      onClick={() =>
                        setNewTemplate({
                          ...newTemplate,
                          content: (newTemplate.content ?? "") + v,
                        })
                      }
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-[#2b4d24] hover:bg-[#1a3a15]"
                  onClick={addTemplate}
                  disabled={!newTemplate.name}
                >
                  Save Template
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setNewTemplate(EMPTY_TEMPLATE);
                    setActiveTab("list");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Send Log Tab ──────────────────── */}
        <TabsContent value="log" className="mt-6 space-y-4">
          {sendLog.length > 0 ? (
            <div className="space-y-3">
              {sendLog.slice(0, 50).map((entry) => {
                const Icon = channelIcon(entry.channel);
                return (
                  <Card key={entry.id} className="glass-pane">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Icon className="h-4 w-4 text-[#2b4d24] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1a1a1a]">
                          {entry.templateName}
                        </p>
                        <p className="text-[10px] text-[#999999]">
                          Test sent via {entry.channel.replace("_", " ")}
                        </p>
                      </div>
                      <span className="text-xs text-[#999999]">
                        {new Date(entry.sentAt).toLocaleString()}
                      </span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl glass-subtle border-dashed px-6 py-16 text-center">
              <Send className="h-7 w-7 text-[#8b957b] mb-3" />
              <p className="font-serif text-lg text-[#1a1a1a]">No sends yet</p>
              <p className="text-sm text-[#666666]">
                Test send a template to see it logged here.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Edit Dialog ──────────────────── */}
      <Dialog
        open={Boolean(editingTemplate)}
        onOpenChange={(open) => !open && setEditingTemplate(null)}
      >
        <DialogContent className="max-w-xl glass-elevated border-0 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              Edit Template
            </DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={editingTemplate.name}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        name: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Channel</Label>
                  <Select
                    value={editingTemplate.channel}
                    onValueChange={(value) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        channel: value as Channel,
                        subject:
                          value === "email"
                            ? editingTemplate.subject
                            : undefined,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {CHANNELS.map((ch) => (
                        <SelectItem key={ch.value} value={ch.value}>
                          {ch.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editingTemplate.status}
                    onValueChange={(value) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        status: value as TemplateStatus,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {editingTemplate.channel === "email" && (
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    value={editingTemplate.subject ?? ""}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        subject: e.target.value,
                      })
                    }
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={editingTemplate.content}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      content: e.target.value,
                    })
                  }
                  rows={8}
                />
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="text-[10px] text-[#999999]">Variables:</span>
                  {VARIABLE_HINTS.map((v) => (
                    <button
                      key={v}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-[#FAF9F6] border border-[#e5e5e0] text-[#666666] hover:bg-[#2b4d24]/5 hover:text-[#2b4d24] transition-colors"
                      onClick={() =>
                        setEditingTemplate({
                          ...editingTemplate,
                          content: editingTemplate.content + v,
                        })
                      }
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                className="w-full bg-[#2b4d24] hover:bg-[#1a3a15]"
                onClick={updateTemplate}
              >
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Preview Dialog ──────────────────── */}
      <Dialog
        open={Boolean(previewTemplate)}
        onOpenChange={(open) => !open && setPreviewTemplate(null)}
      >
        <DialogContent className="max-w-lg glass-elevated border-0">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              Template Preview
            </DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge
                  className={`text-[10px] border ${channelColor(previewTemplate.channel)}`}
                >
                  {previewTemplate.channel.replace("_", " ")}
                </Badge>
                <span className="text-sm font-medium text-[#1a1a1a]">
                  {previewTemplate.name}
                </span>
              </div>
              {previewTemplate.subject && (
                <div className="rounded-md bg-[#FAF9F6] px-4 py-2">
                  <p className="text-xs text-[#999999]">Subject</p>
                  <p className="text-sm text-[#1a1a1a]">
                    {previewTemplate.subject}
                  </p>
                </div>
              )}
              <div className="rounded-lg border border-[#e5e5e0] p-4 bg-white space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-[#999999]">
                  Preview (sample data)
                </p>
                <p className="text-sm text-[#333333] leading-relaxed whitespace-pre-wrap">
                  {renderPreview(previewTemplate)}
                </p>
              </div>
              <div className="rounded-lg border border-[#e5e5e0] p-4 bg-[#FAF9F6] space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-[#999999]">
                  Raw template
                </p>
                <p className="text-xs text-[#666666] font-mono whitespace-pre-wrap">
                  {previewTemplate.content}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ──────────────────── */}
      <Dialog
        open={Boolean(deleteConfirmId)}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent className="max-w-sm glass-elevated border-0">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Delete Template
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#666666]">
            Are you sure you want to delete &ldquo;
            {templates.find((t) => t.id === deleteConfirmId)?.name}
            &rdquo;? This action cannot be undone.
          </p>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDeleteConfirmId(null)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-red-500 hover:bg-red-600 text-white"
              onClick={() =>
                deleteConfirmId && deleteTemplate(deleteConfirmId)
              }
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
