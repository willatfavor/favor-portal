"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useCourses } from "@/hooks/use-courses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/portal/empty-state";
import { BookOpen, ChevronLeft, Clock, PlayCircle, CheckCircle2 } from "lucide-react";

export default function CourseDetailPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params?.courseId;
  const { user } = useAuth();
  const { courses, modules, progress, isLoading, updateProgress } = useCourses(user?.id);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);

  const course = useMemo(
    () => courses.find((c) => c.id === courseId),
    [courses, courseId]
  );

  const courseModules = useMemo(
    () => modules.filter((m) => m.courseId === courseId),
    [modules, courseId]
  );

  const progressMap = useMemo(() => {
    return new Map(progress.map((p) => [p.moduleId, p]));
  }, [progress]);

  const completedCount = courseModules.filter((m) => progressMap.get(m.id)?.completed).length;
  const totalCount = courseModules.length || 0;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  useEffect(() => {
    if (!activeModuleId && courseModules.length > 0) {
      setActiveModuleId(courseModules[0].id);
    }
  }, [activeModuleId, courseModules]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-[#666666]">Loading course...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Course not found"
        description="We couldn't find this course in your catalog."
        actionLabel="Back to Courses"
        actionHref="/courses"
      />
    );
  }

  const activeModule =
    courseModules.find((m) => m.id === activeModuleId) ?? courseModules[0];
  const activeProgress = activeModule ? progressMap.get(activeModule.id) : undefined;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/courses" className="inline-flex items-center text-xs text-[#999999] hover:text-[#666666]">
          <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Back to Courses
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-3xl font-semibold text-[#1a1a1a]">{course.title}</h1>
          <Badge className="bg-[#2b4d24] text-[#FFFEF9] text-[10px] uppercase tracking-wide">
            {course.accessLevel.replace("_", " ")}
          </Badge>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-[#666666]">{course.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[#999999]">
          <span className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" /> {totalCount} modules
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> ~{Math.round(totalCount * 15)} min
          </span>
        </div>
        <div className="mt-4 max-w-xl">
          <Progress value={completionRate} className="h-2" />
          <p className="mt-1 text-xs text-[#999999]">{completionRate}% complete</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Card className="glass-pane">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-lg">Modules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {courseModules.map((module, index) => {
              const isActive = module.id === activeModule?.id;
              const isComplete = progressMap.get(module.id)?.completed;
              return (
                <button
                  key={module.id}
                  onClick={() => setActiveModuleId(module.id)}
                  className={`w-full rounded-xl p-3 text-left glass-transition ${
                    isActive ? "bg-[#2b4d24]/10 border border-[#2b4d24]/20" : "glass-inset"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-[#999999]">Module {index + 1}</p>
                      <p className="text-sm font-medium text-[#1a1a1a]">{module.title}</p>
                    </div>
                    {isComplete ? (
                      <CheckCircle2 className="h-4 w-4 text-[#2b4d24]" />
                    ) : (
                      <PlayCircle className="h-4 w-4 text-[#c5ccc2]" />
                    )}
                  </div>
                  {module.description && (
                    <p className="mt-1 text-xs text-[#999999] line-clamp-2">{module.description}</p>
                  )}
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="glass-pane overflow-hidden">
            <div className="relative aspect-video bg-gradient-to-br from-[#2b4d24]/15 to-[#8b957b]/10 flex items-center justify-center">
              <PlayCircle className="h-12 w-12 text-[#2b4d24]" />
            </div>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#999999]">Now Playing</p>
                  <h2 className="font-serif text-xl text-[#1a1a1a]">{activeModule?.title}</h2>
                </div>
                <Badge variant="outline" className="text-[10px] text-[#8b957b]">
                  {activeModule ? Math.round(activeModule.durationSeconds / 60) : 0} min
                </Badge>
              </div>
              <p className="text-sm text-[#666666]">
                {activeModule?.description || "Follow along with this module to deepen your understanding."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="bg-[#2b4d24] hover:bg-[#1a3a15]"
                  onClick={() =>
                    activeModule &&
                    updateProgress(activeModule.id, {
                      completed: !activeProgress?.completed,
                      watchTimeSeconds: activeModule.durationSeconds,
                    })
                  }
                >
                  {activeProgress?.completed ? "Mark Incomplete" : "Mark Complete"}
                </Button>
                <Button variant="outline">
                  Download Notes
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-subtle border-0">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-serif text-lg text-[#1a1a1a]">Learning Reflection</h3>
              <p className="text-sm text-[#666666]">
                Capture key takeaways or questions as you go. These notes remain private and can be revisited later.
              </p>
              <div className="rounded-xl glass-inset p-3 text-sm text-[#999999]">
                Notes feature is in mock mode. Add your own journaling workflow here later.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
