"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useContent } from "@/hooks/use-content";
import { ContentItem } from "@/types";
import { canAccessContent } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/portal/empty-state";
import { SectionHeader } from "@/components/portal/section-header";
import { FileText, Search, Lock, ArrowRight } from "lucide-react";

const FILTERS = ["All", "Reports", "Updates", "Resources", "Prayer", "Stories"] as const;

function normalizeType(item: ContentItem) {
  switch (item.type) {
    case "report":
      return "Reports";
    case "update":
      return "Updates";
    case "resource":
      return "Resources";
    case "prayer":
      return "Prayer";
    case "story":
      return "Stories";
    default:
      return "All";
  }
}

export default function ContentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="text-[#666666]">Loading content...</div>
        </div>
      }
    >
      <ContentPageContent />
    </Suspense>
  );
}

function ContentPageContent() {
  const { user } = useAuth();
  const { items, isLoading } = useContent();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const searchParams = useSearchParams();
  const tagFilter = (searchParams.get("tag") ?? "").toLowerCase();
  const typeParam = (searchParams.get("type") ?? "").toLowerCase();

  useEffect(() => {
    if (!typeParam) return;
    const mapped = typeParam === "report"
      ? "Reports"
      : typeParam === "update"
        ? "Updates"
        : typeParam === "resource"
          ? "Resources"
          : typeParam === "prayer"
            ? "Prayer"
            : typeParam === "story"
              ? "Stories"
              : "All";
    setFilter(mapped);
  }, [typeParam]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchFilter = filter === "All" || normalizeType(item) === filter;
      const query = search.toLowerCase();
      const matchSearch =
        item.title.toLowerCase().includes(query) ||
        item.excerpt.toLowerCase().includes(query) ||
        item.tags.join(" ").toLowerCase().includes(query);
      const matchTag =
        !tagFilter || item.tags.some((tag) => tag.toLowerCase() === tagFilter);
      return matchFilter && matchSearch && matchTag;
    });
  }, [items, filter, search, tagFilter]);

  const accessible = useMemo(() => {
    const type = user?.constituentType ?? "individual";
    return filtered.filter((item) => canAccessContent(item.accessLevel, type));
  }, [filtered, user]);

  const locked = useMemo(() => {
    const type = user?.constituentType ?? "individual";
    return filtered.filter((item) => !canAccessContent(item.accessLevel, type));
  }, [filtered, user]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-[#666666]">Loading content...</div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav className="mb-2 flex items-center gap-1 text-xs text-[#999999]">
            <Link href="/dashboard" className="hover:text-[#666666]">Home</Link>
            <span>/</span>
            <span className="font-medium text-[#1a1a1a]">Content</span>
          </nav>
          <h1 className="font-serif text-3xl font-semibold text-[#1a1a1a]">Content Library</h1>
          <p className="mt-1 text-sm text-[#666666]">
            Reports, resources, and updates tailored to your partnership.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999999]" />
          <Input
            placeholder="Search content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((label) => (
          <Button
            key={label}
            variant={filter === label ? "default" : "outline"}
            size="sm"
            className={filter === label ? "bg-[#2b4d24] hover:bg-[#1a3a15]" : ""}
            onClick={() => setFilter(label)}
          >
            {label}
          </Button>
        ))}
      </div>
      {tagFilter && (
        <p className="text-xs text-[#999999]">
          Filtered by tag: <span className="text-[#666666]">{tagFilter}</span>
        </p>
      )}

      <section>
        <SectionHeader title="Available to You" subtitle={`${accessible.length} items`} />
        <div className="mt-5">
          {accessible.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {accessible.map((item) => (
                <Card key={item.id} className="glass-hover overflow-hidden">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] text-[#8b957b]">
                        {normalizeType(item)}
                      </Badge>
                      <span className="text-xs text-[#999999]">
                        {new Date(item.date).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-serif text-lg text-[#1a1a1a]">{item.title}</h3>
                    <p className="text-sm text-[#666666] line-clamp-2">{item.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        {item.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <Button variant="ghost" size="sm" className="text-[#2b4d24]" asChild>
                        <Link href={`/content/${item.id}`}>
                          View <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="No content found"
              description="Try adjusting your filters or search terms."
            />
          )}
        </div>
      </section>

      {locked.length > 0 && (
        <section>
          <SectionHeader title="Locked Content" subtitle="Available with additional access" />
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {locked.map((item) => (
              <Card key={item.id} className="glass-subtle border-0 opacity-80">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] text-[#8b957b]">
                      {normalizeType(item)}
                    </Badge>
                    <Lock className="h-3.5 w-3.5 text-[#c5ccc2]" />
                  </div>
                  <h3 className="font-serif text-lg text-[#1a1a1a]">{item.title}</h3>
                  <p className="text-sm text-[#999999] line-clamp-2">{item.excerpt}</p>
                  <Button variant="outline" size="sm" className="w-full">
                    Request Access
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
