"use client";

import { useEffect, useMemo, useState } from "react";
import { ContentItem } from "@/types";
import { getMockContent, setMockContent } from "@/lib/mock-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileText, PlusCircle, Search } from "lucide-react";

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
    type: "update",
    accessLevel: "partner",
  });

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
    };
    const next = [created, ...items];
    setItems(next);
    setMockContent(next);
    setNewItem({ title: "", excerpt: "", type: "update", accessLevel: "partner" });
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
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-[#2b4d24] hover:bg-[#1a3a15]">
                <PlusCircle className="mr-2 h-4 w-4" /> New Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg glass-elevated border-0">
              <DialogHeader>
                <DialogTitle className="font-serif text-xl">Create Content</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={newItem.title ?? ""}
                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Excerpt</Label>
                  <Input
                    value={newItem.excerpt ?? ""}
                    onChange={(e) => setNewItem({ ...newItem, excerpt: e.target.value })}
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
                <Button className="w-full bg-[#2b4d24] hover:bg-[#1a3a15]" onClick={addContent}>
                  Save Content
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

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
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Edit
                </Button>
                <Button variant="outline" size="sm">
                  Publish
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
