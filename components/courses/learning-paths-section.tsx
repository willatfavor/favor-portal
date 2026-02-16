"use client";

import { useEffect, useMemo, useState } from "react";
import type { Course, CourseModule, UserCourseProgress, LearningPath } from "@/types";
import { isDevBypass } from "@/lib/dev-mode";
import {
  getMockCourses,
  getMockCoursesForLearningPath,
  getMockLearningPathProgressForUser,
  getMockLearningPaths,
  upsertMockLearningPathProgress,
} from "@/lib/mock-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface PathCourseView {
  id: string;
  learningPathId: string;
  courseId: string;
  courseTitle: string;
  sortOrder: number;
  required: boolean;
  completed: boolean;
}

interface LearningPathView extends LearningPath {
  courses: PathCourseView[];
}

interface Props {
  userId?: string;
  courses: Course[];
  modules: CourseModule[];
  progress: UserCourseProgress[];
}

function getCourseCompletionMap(
  courses: Course[],
  modules: CourseModule[],
  progress: UserCourseProgress[]
) {
  const progressByModule = new Map(progress.map((entry) => [entry.moduleId, entry]));
  return new Map(
    courses.map((course) => {
      const courseModules = modules.filter((module) => module.courseId === course.id);
      const completed =
        courseModules.length > 0 && courseModules.every((module) => progressByModule.get(module.id)?.completed);
      return [course.id, completed];
    })
  );
}

export function LearningPathsSection({ userId, courses, modules, progress }: Props) {
  const [paths, setPaths] = useState<LearningPathView[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const completionMap = useMemo(
    () => getCourseCompletionMap(courses, modules, progress),
    [courses, modules, progress]
  );

  useEffect(() => {
    async function loadPaths() {
      if (!userId) return;
      setIsLoading(true);
      setError(null);
      setMessage(null);

      if (isDevBypass) {
        const courseTitleMap = new Map(getMockCourses().map((course) => [course.id, course.title]));
        const progressRows = getMockLearningPathProgressForUser(userId);
        const progressMap = new Map(progressRows.map((row) => [row.learningPathId, row]));
        const activePaths = getMockLearningPaths().filter((path) => path.isActive);
        const mapped = activePaths.map((path) => {
          const entries = getMockCoursesForLearningPath(path.id).map((entry) => ({
            id: entry.id,
            learningPathId: entry.learningPathId,
            courseId: entry.courseId,
            courseTitle: courseTitleMap.get(entry.courseId) ?? "Course",
            sortOrder: entry.sortOrder,
            required: entry.required,
            completed: Boolean(completionMap.get(entry.courseId)),
          }));
          const requiredEntries = entries.filter((entry) => entry.required);
          const totalCourses = requiredEntries.length;
          const completedCourses = requiredEntries.filter((entry) => entry.completed).length;
          const completionPercent = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;
          const progressRow = progressMap.get(path.id);
          return {
            ...path,
            courses: entries,
            coursesCount: entries.length,
            completionPercent,
            isEnrolled: Boolean(progressRow),
            status: progressRow?.status ?? "enrolled",
          };
        });
        setPaths(mapped);
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/lms/learning-paths");
      const json = (await response.json()) as { paths?: LearningPathView[]; error?: string };
      if (!response.ok) {
        setError(json.error ?? "Unable to load learning paths");
        setPaths([]);
        setIsLoading(false);
        return;
      }
      setPaths(json.paths ?? []);
      setIsLoading(false);
    }

    void loadPaths();
  }, [completionMap, userId]);

  async function enroll(path: LearningPathView) {
    if (!userId) return;
    setIsSaving(true);
    setMessage(null);
    setError(null);

    if (isDevBypass) {
      const requiredEntries = path.courses.filter((entry) => entry.required);
      const totalCourses = requiredEntries.length;
      const completedCourses = requiredEntries.filter((entry) => entry.completed).length;
      const completionPercent = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;
      const now = new Date().toISOString();
      upsertMockLearningPathProgress({
        id: `path-progress-${path.id}-${userId}`,
        learningPathId: path.id,
        userId,
        completedCourses,
        totalCourses,
        completionPercent,
        lastCalculatedAt: now,
        enrolledAt: now,
        completedAt: completionPercent === 100 ? now : undefined,
        status: completionPercent === 100 ? "completed" : "enrolled",
      });
      setPaths((current) =>
        current.map((entry) =>
          entry.id === path.id
            ? {
                ...entry,
                isEnrolled: true,
                completionPercent,
                status: completionPercent === 100 ? "completed" : "enrolled",
              }
            : entry
        )
      );
      setMessage("Learning path enrolled.");
      setIsSaving(false);
      return;
    }

    const response = await fetch(`/api/lms/learning-paths/${path.id}/enroll`, { method: "POST" });
    const json = (await response.json()) as {
      progress?: {
        completionPercent: number;
        status: "enrolled" | "completed" | "paused";
      };
      error?: string;
    };
    if (!response.ok || !json.progress) {
      setError(json.error ?? "Unable to enroll in learning path");
      setIsSaving(false);
      return;
    }

    setPaths((current) =>
      current.map((entry) =>
        entry.id === path.id
          ? {
              ...entry,
              isEnrolled: true,
              completionPercent: json.progress?.completionPercent,
              status: json.progress?.status,
            }
          : entry
      )
    );
    setMessage("Learning path enrolled.");
    setIsSaving(false);
  }

  if (!userId) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl text-[#1a1a1a]">Learning Paths</h2>
          <p className="text-sm text-[#666666]">
            Follow guided certification tracks with measurable progression.
          </p>
        </div>
      </div>

      {message && <p className="text-xs text-[#2b4d24]">{message}</p>}
      {error && <p className="text-xs text-[#a36d4c]">{error}</p>}

      {isLoading ? (
        <Card>
          <CardContent className="p-5 text-sm text-[#666666]">Loading learning paths...</CardContent>
        </Card>
      ) : paths.length === 0 ? (
        <Card>
          <CardContent className="p-5 text-sm text-[#666666]">
            Learning paths will appear here when published.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {paths.map((path) => {
            const completionPercent = path.completionPercent ?? 0;
            return (
              <Card key={path.id} className="glass-subtle border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                    {path.title}
                    <Badge variant="outline" className="text-[10px]">
                      {path.audience.replace("_", " ")}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {path.coursesCount ?? path.courses.length} courses
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-[#666666]">{path.description || "No description yet."}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-[#8b957b]">
                      <span>Progress</span>
                      <span>{completionPercent}%</span>
                    </div>
                    <Progress value={completionPercent} />
                  </div>
                  <div className="space-y-1">
                    {path.courses
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .slice(0, 4)
                      .map((course) => (
                        <p key={course.id} className="text-xs text-[#666666]">
                          {course.sortOrder}. {course.courseTitle} {course.completed ? "- Complete" : ""}
                        </p>
                      ))}
                  </div>
                  <Button
                    className="w-full bg-[#2b4d24] hover:bg-[#1a3a15]"
                    variant={path.isEnrolled ? "outline" : "default"}
                    disabled={isSaving || Boolean(path.isEnrolled)}
                    onClick={() => void enroll(path)}
                  >
                    {path.isEnrolled ? "Enrolled" : "Enroll in Track"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
