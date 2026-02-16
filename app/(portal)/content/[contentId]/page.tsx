"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useContent } from "@/hooks/use-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/portal/empty-state";
import { recordActivity } from "@/lib/mock-store";
import { isDevBypass } from "@/lib/dev-mode";

export default function ContentDetailPage() {
  const params = useParams<{ contentId: string }>();
  const contentId = params?.contentId;
  const { user } = useAuth();
  const { items, isLoading } = useContent();

  const item = useMemo(
    () => items.find((entry) => entry.id === contentId),
    [items, contentId]
  );

  useEffect(() => {
    if (!item || !user?.id || !isDevBypass) return;
    recordActivity({
      id: `activity-${Date.now()}`,
      type: "content_viewed",
      userId: user.id,
      createdAt: new Date().toISOString(),
      metadata: { contentId: item.id, type: item.type },
    });
  }, [item, user?.id]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-[#666666]">Loading content...</div>
      </div>
    );
  }

  if (!item) {
    return (
      <EmptyState
        icon={FileText}
        title="Content not found"
        description="We couldn't locate that update in your library."
        actionLabel="Back to Content"
        actionHref="/content"
      />
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/content" className="inline-flex items-center text-xs text-[#999999] hover:text-[#666666]">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to Content
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[10px] text-[#8b957b]">
            {item.type}
          </Badge>
          {item.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
        <h1 className="mt-3 font-serif text-3xl font-semibold text-[#1a1a1a]">
          {item.title}
        </h1>
        <p className="mt-1 text-sm text-[#666666]">
          {new Date(item.date).toLocaleDateString()} • {item.author}
        </p>
      </div>

      <Card className="glass-pane overflow-hidden">
        <div className="relative aspect-[16/9] bg-gradient-to-br from-[#FAF9F6] to-[#F5F3EF]">
          {item.coverImage ? (
            <img src={item.coverImage} alt={item.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-[#c5ccc2]">
              <FileText className="h-10 w-10" />
            </div>
          )}
        </div>
        <CardContent className="p-6 space-y-4">
          <p className="text-sm text-[#666666]">{item.excerpt}</p>
          <div className="space-y-3 text-sm text-[#4b4b4b] leading-relaxed">
            {item.body.split("\n").map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
          {item.fileUrl && (
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => window.open(item.fileUrl, "_blank")}
            >
              <Download className="mr-2 h-4 w-4" /> Download Attachment
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
