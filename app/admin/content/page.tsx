"use client";

import { useEffect, useMemo, useState } from "react";
import { ContentItem } from "@/types";
import { getMockContent, setMockContent } from "@/lib/mock-store";
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
  FileText,
  PlusCircle,
  Search,
  Pencil,
  Image as ImageIcon,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  BarChart3,
  BookOpen,
  Clock,
  AlertCircle,
} from "lucide-react";

const TYPES: ContentItem["type"][] = ["report", "update", "resource", "prayer", "story"];
const ACCESS: ContentItem["accessLevel"][] = [
  "all",
  "partner",
  "major_donor",
  "church",
  "foundation",
  "daf",
  "ambassador",
  "volunteer",
];

type ContentStatus = "published" | "draft";

interface ContentItemWithStatus extends ContentItem {
  status?: ContentStatus;
}

const EMPTY_ITEM: Partial<ContentItemWithStatus> = {
  title: "",
  excerpt: "",
  body: "",
  type: "update",
  accessLevel: "partner",
  author: "Favor International",
  tags: [],
  coverImage: "",
  fileUrl: "",
  status: "draft",
};

function typeColor(type: ContentItem["type"]): string {
  switch (type) {
    case "report":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "update":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "resource":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "prayer":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "story":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
}

export default function AdminContentPage() {
  const [items, setItems] = useState<ContentItemWithStatus[]>([]);
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterAccess, setFilterAccess] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [newItem, setNewItem] = useState<Partial<ContentItemWithStatus>>(EMPTY_ITEM);
  const [editingItem, setEditingItem] = useState<ContentItemWithStatus | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("list");

  useEffect(() => {
    const raw = getMockContent();
    setItems(
      raw.map((item) => ({
        ...item,
        status: (item as ContentItemWithStatus).status ?? "published",
      }))
    );
  }, []);

  const persist = (next: ContentItemWithStatus[]) => {
    setItems(next);
    setMockContent(next);
  };

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchQuery =
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.excerpt.toLowerCase().includes(query.toLowerCase()) ||
        item.tags.join(" ").toLowerCase().includes(query.toLowerCase());
      const matchType = filterType === "all" || item.type === filterType;
      const matchAccess = filterAccess === "all" || item.accessLevel === filterAccess;
      const matchStatus =
        filterStatus === "all" || (item.status ?? "published") === filterStatus;
      return matchQuery && matchType && matchAccess && matchStatus;
    });
  }, [items, query, filterType, filterAccess, filterStatus]);

  // Stats
  const totalItems = items.length;
  const publishedCount = items.filter((i) => (i.status ?? "published") === "published").length;
  const draftCount = items.filter((i) => i.status === "draft").length;
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      counts[item.type] = (counts[item.type] || 0) + 1;
    });
    return counts;
  }, [items]);

  function addContent() {
    if (!newItem.title || !newItem.excerpt) return;
    const created: ContentItemWithStatus = {
      id: `content-${Date.now()}`,
      title: newItem.title,
      excerpt: newItem.excerpt,
      body: newItem.body || newItem.excerpt,
      type: newItem.type ?? "update",
      accessLevel: newItem.accessLevel ?? "partner",
      date: new Date().toISOString().slice(0, 10),
      author: newItem.author || "Favor International",
      tags: newItem.tags || [],
      coverImage: newItem.coverImage,
      fileUrl: newItem.fileUrl,
      status: newItem.status ?? "draft",
    };
    persist([created, ...items]);
    setNewItem(EMPTY_ITEM);
    setActiveTab("list");
  }

  function updateContent() {
    if (!editingItem) return;
    const next = items.map((item) =>
      item.id === editingItem.id ? editingItem : item
    );
    persist(next);
    setEditingItem(null);
  }

  function deleteContent(id: string) {
    persist(items.filter((item) => item.id !== id));
    setDeleteConfirmId(null);
  }

  function duplicateContent(item: ContentItemWithStatus) {
    const dupe: ContentItemWithStatus = {
      ...item,
      id: `content-${Date.now()}`,
      title: `${item.title} (Copy)`,
      status: "draft",
      date: new Date().toISOString().slice(0, 10),
    };
    persist([dupe, ...items]);
  }

  function togglePublish(id: string) {
    const next = items.map((item) =>
      item.id === id
        ? {
            ...item,
            status:
              (item.status ?? "published") === "published"
                ? ("draft" as ContentStatus)
                : ("published" as ContentStatus),
          }
        : item
    );
    persist(next);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-[#1a1a1a]">Content Management</h1>
          <p className="text-sm text-[#666666]">
            Publish blog posts, reports, and downloadable resources.
          </p>
        </div>
        <Button
          className="bg-[#2b4d24] hover:bg-[#1a3a15]"
          onClick={() => setActiveTab("create")}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> New Item
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Items", value: totalItems, icon: BookOpen, sub: "All content" },
          {
            label: "Published",
            value: publishedCount,
            icon: Eye,
            sub: "Visible to users",
          },
          { label: "Drafts", value: draftCount, icon: Clock, sub: "Not yet live" },
          {
            label: "Types",
            value: Object.keys(typeCounts).length,
            icon: BarChart3,
            sub: `${typeCounts["report"] || 0} reports, ${typeCounts["resource"] || 0} resources`,
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2b4d24]/5">
                <stat.icon className="h-5 w-5 text-[#2b4d24]" />
              </div>
              <div>
                <p className="text-xs text-[#999999]">{stat.label}</p>
                <p className="text-xl font-semibold text-[#1a1a1a]">{stat.value}</p>
                <p className="text-[10px] text-[#999999]">{stat.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">All Content</TabsTrigger>
          <TabsTrigger value="create">Create New</TabsTrigger>
        </TabsList>

        {/* ── List Tab ──────────────────── */}
        <TabsContent value="list" className="space-y-6 mt-6">
          {/* Filters row */}
          <div className="flex flex-wrap gap-3">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999999]" />
              <Input
                placeholder="Search content..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterAccess} onValueChange={setFilterAccess}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Access" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Access</SelectItem>
                {ACCESS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level.replace("_", " ")}
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
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-[#999999]">
            Showing {filtered.length} of {items.length} items
          </p>

          {/* Content list */}
          <div className="space-y-3">
            {filtered.map((item) => (
              <Card key={item.id} className="glass-pane">
                <CardContent className="p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <FileText className="h-4 w-4 text-[#2b4d24] flex-shrink-0" />
                      <p className="text-sm font-medium text-[#1a1a1a]">
                        {item.title}
                      </p>
                    </div>
                    <p className="text-xs text-[#999999] mt-1 line-clamp-1">
                      {item.excerpt}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge className={`text-[10px] border ${typeColor(item.type)}`}>
                        {item.type}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {item.accessLevel.replace("_", " ")}
                      </Badge>
                      <Badge
                        variant={
                          (item.status ?? "published") === "published"
                            ? "default"
                            : "outline"
                        }
                        className={
                          (item.status ?? "published") === "published"
                            ? "text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "text-[10px] text-[#999999]"
                        }
                      >
                        {(item.status ?? "published") === "published"
                          ? "Published"
                          : "Draft"}
                      </Badge>
                      {item.coverImage && (
                        <Badge variant="secondary" className="text-[10px]">
                          <ImageIcon className="mr-1 h-3 w-3" /> Cover
                        </Badge>
                      )}
                      <span className="text-[10px] text-[#999999]">
                        {new Date(item.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => togglePublish(item.id)}
                      title={
                        (item.status ?? "published") === "published"
                          ? "Unpublish"
                          : "Publish"
                      }
                    >
                      {(item.status ?? "published") === "published" ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingItem(item)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => duplicateContent(item)}
                      title="Duplicate"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteConfirmId(item.id)}
                      className="text-red-500 hover:text-red-600 hover:border-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-2xl glass-subtle border-dashed px-6 py-16 text-center">
                <FileText className="h-7 w-7 text-[#8b957b] mb-3" />
                <p className="font-serif text-lg text-[#1a1a1a]">No content found</p>
                <p className="text-sm text-[#666666]">
                  Try adjusting your filters or create new content.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Create Tab ──────────────────── */}
        <TabsContent value="create" className="mt-6">
          <Card className="glass-pane">
            <CardContent className="p-6 space-y-5">
              <h2 className="font-serif text-xl text-[#1a1a1a]">Create Content</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={newItem.title ?? ""}
                    onChange={(e) =>
                      setNewItem({ ...newItem, title: e.target.value })
                    }
                    placeholder="Enter content title..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Author</Label>
                  <Input
                    value={newItem.author ?? ""}
                    onChange={(e) =>
                      setNewItem({ ...newItem, author: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Excerpt</Label>
                <Input
                  value={newItem.excerpt ?? ""}
                  onChange={(e) =>
                    setNewItem({ ...newItem, excerpt: e.target.value })
                  }
                  placeholder="Brief summary visible in cards..."
                />
              </div>
              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea
                  value={newItem.body ?? ""}
                  onChange={(e) =>
                    setNewItem({ ...newItem, body: e.target.value })
                  }
                  rows={8}
                  placeholder="Full article content. Use line breaks for paragraphs."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={newItem.type}
                    onValueChange={(value) =>
                      setNewItem({
                        ...newItem,
                        type: value as ContentItem["type"],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Access Level</Label>
                  <Select
                    value={newItem.accessLevel}
                    onValueChange={(value) =>
                      setNewItem({
                        ...newItem,
                        accessLevel: value as ContentItem["accessLevel"],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Access" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCESS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={newItem.status}
                    onValueChange={(value) =>
                      setNewItem({
                        ...newItem,
                        status: value as ContentStatus,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Cover Image URL</Label>
                  <Input
                    value={newItem.coverImage ?? ""}
                    onChange={(e) =>
                      setNewItem({ ...newItem, coverImage: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Download File URL</Label>
                  <Input
                    value={newItem.fileUrl ?? ""}
                    onChange={(e) =>
                      setNewItem({ ...newItem, fileUrl: e.target.value })
                    }
                    placeholder="/files/report.pdf"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tags (comma separated)</Label>
                <Input
                  value={(newItem.tags ?? []).join(", ")}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      tags: e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="impact, report, partner"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-[#2b4d24] hover:bg-[#1a3a15]"
                  onClick={addContent}
                  disabled={!newItem.title || !newItem.excerpt}
                >
                  Save Content
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setNewItem(EMPTY_ITEM);
                    setActiveTab("list");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Edit Dialog ──────────────────── */}
      <Dialog
        open={Boolean(editingItem)}
        onOpenChange={(open) => !open && setEditingItem(null)}
      >
        <DialogContent className="max-w-xl glass-elevated border-0 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Edit Content</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editingItem.title}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Excerpt</Label>
                <Input
                  value={editingItem.excerpt}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, excerpt: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea
                  value={editingItem.body}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, body: e.target.value })
                  }
                  rows={8}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={editingItem.type}
                    onValueChange={(value) =>
                      setEditingItem({
                        ...editingItem,
                        type: value as ContentItem["type"],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Access Level</Label>
                  <Select
                    value={editingItem.accessLevel}
                    onValueChange={(value) =>
                      setEditingItem({
                        ...editingItem,
                        accessLevel: value as ContentItem["accessLevel"],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Access" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCESS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editingItem.status ?? "published"}
                    onValueChange={(value) =>
                      setEditingItem({
                        ...editingItem,
                        status: value as ContentStatus,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Cover Image</Label>
                  <Input
                    value={editingItem.coverImage ?? ""}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        coverImage: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>File URL</Label>
                  <Input
                    value={editingItem.fileUrl ?? ""}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        fileUrl: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <Input
                  value={editingItem.tags.join(", ")}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      tags: e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Author</Label>
                <Input
                  value={editingItem.author}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, author: e.target.value })
                  }
                />
              </div>
              <Button
                className="w-full bg-[#2b4d24] hover:bg-[#1a3a15]"
                onClick={updateContent}
              >
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ──────────────────── */}
      <Dialog
        open={Boolean(deleteConfirmId)}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent className="max-w-sm glass-elevated border-0">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Delete Content
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#666666]">
            Are you sure you want to delete &ldquo;
            {items.find((i) => i.id === deleteConfirmId)?.title}
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
              onClick={() => deleteConfirmId && deleteContent(deleteConfirmId)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
