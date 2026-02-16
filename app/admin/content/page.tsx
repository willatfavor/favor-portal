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
import { FileText, PlusCircle, Search, Pencil, Image as ImageIcon } from "lucide-react";

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

export default function AdminContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [query, setQuery] = useState("");
  const [newItem, setNewItem] = useState<Partial<ContentItem>>({
    title: "",
    excerpt: "",
    body: "",
    type: "update",
    accessLevel: "partner",
    author: "Favor International",
    tags: [],
    coverImage: "",
    fileUrl: "",
  });
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);

  useEffect(() => {
    setItems(getMockContent());
  }, []);

  const filtered = useMemo(() => {
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.excerpt.toLowerCase().includes(query.toLowerCase())
    );
  }, [items, query]);

  function addContent() {
    if (!newItem.title || !newItem.excerpt) return;
    const created: ContentItem = {
      id: `content-${Date.now()}`,
      title: newItem.title,
      excerpt: newItem.excerpt,
      body: newItem.body || newItem.excerpt,
      type: newItem.type ?? "update",
      accessLevel: newItem.accessLevel ?? "partner",
      date: new Date().toISOString().slice(0, 10),
      author: newItem.author || "Favor International",
      tags: newItem.tags || ["update"],
      coverImage: newItem.coverImage,
      fileUrl: newItem.fileUrl,
    };
    const next = [created, ...items];
    setItems(next);
    setMockContent(next);
    setNewItem({
      title: "",
      excerpt: "",
      body: "",
      type: "update",
      accessLevel: "partner",
      author: "Favor International",
      tags: [],
      coverImage: "",
      fileUrl: "",
    });
  }

  function updateContent() {
    if (!editingItem) return;
    const next = items.map((item) => (item.id === editingItem.id ? editingItem : item));
    setItems(next);
    setMockContent(next);
    setEditingItem(null);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-[#1a1a1a]">Content Management</h1>
          <p className="text-sm text-[#666666]">Publish blog posts, reports, and downloadable resources.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999999]" />
            <Input
              placeholder="Search content..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            className="bg-[#2b4d24] hover:bg-[#1a3a15]"
            onClick={() =>
              document.getElementById("content-create")?.scrollIntoView({ behavior: "smooth" })
            }
          >
            <PlusCircle className="mr-2 h-4 w-4" /> New Item
          </Button>
        </div>
      </div>

      <Card className="glass-pane" id="content-create">
        <CardContent className="p-5 space-y-4">
          <h2 className="font-serif text-xl text-[#1a1a1a]">Create Content</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newItem.title ?? ""}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Author</Label>
              <Input
                value={newItem.author ?? ""}
                onChange={(e) => setNewItem({ ...newItem, author: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Excerpt</Label>
            <Input
              value={newItem.excerpt ?? ""}
              onChange={(e) => setNewItem({ ...newItem, excerpt: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Body</Label>
            <Textarea
              value={newItem.body ?? ""}
              onChange={(e) => setNewItem({ ...newItem, body: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={newItem.type}
                onValueChange={(value) => setNewItem({ ...newItem, type: value as ContentItem["type"] })}
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
                  setNewItem({ ...newItem, accessLevel: value as ContentItem["accessLevel"] })
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
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Cover Image URL</Label>
              <Input
                value={newItem.coverImage ?? ""}
                onChange={(e) => setNewItem({ ...newItem, coverImage: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Download File URL</Label>
              <Input
                value={newItem.fileUrl ?? ""}
                onChange={(e) => setNewItem({ ...newItem, fileUrl: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tags (comma separated)</Label>
            <Input
              value={(newItem.tags ?? []).join(", ")}
              onChange={(e) =>
                setNewItem({ ...newItem, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })
              }
            />
          </div>
          <Button className="w-full bg-[#2b4d24] hover:bg-[#1a3a15]" onClick={addContent}>
            Save Content
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filtered.map((item) => (
          <Card key={item.id} className="glass-pane">
            <CardContent className="p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#2b4d24]" />
                  <p className="text-sm font-medium text-[#1a1a1a]">{item.title}</p>
                </div>
                <p className="text-xs text-[#999999]">{item.excerpt}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-[10px] text-[#8b957b]">
                    {item.type}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {item.accessLevel.replace("_", " ")}
                  </Badge>
                  {item.coverImage && (
                    <Badge variant="secondary" className="text-[10px]">
                      <ImageIcon className="mr-1 h-3 w-3" /> Cover
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingItem(item)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                </Button>
                <Button variant="outline" size="sm">
                  Publish
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={Boolean(editingItem)} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-xl glass-elevated border-0">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Edit Content</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Excerpt</Label>
                <Input
                  value={editingItem.excerpt}
                  onChange={(e) => setEditingItem({ ...editingItem, excerpt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea
                  value={editingItem.body}
                  onChange={(e) => setEditingItem({ ...editingItem, body: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={editingItem.type}
                    onValueChange={(value) => setEditingItem({ ...editingItem, type: value as ContentItem["type"] })}
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
                      setEditingItem({ ...editingItem, accessLevel: value as ContentItem["accessLevel"] })
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
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Cover Image</Label>
                  <Input
                    value={editingItem.coverImage ?? ""}
                    onChange={(e) => setEditingItem({ ...editingItem, coverImage: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>File URL</Label>
                  <Input
                    value={editingItem.fileUrl ?? ""}
                    onChange={(e) => setEditingItem({ ...editingItem, fileUrl: e.target.value })}
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
                      tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                    })
                  }
                />
              </div>
              <Button className="w-full bg-[#2b4d24] hover:bg-[#1a3a15]" onClick={updateContent}>
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
