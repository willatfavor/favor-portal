"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCourses } from "@/hooks/use-courses";
import { isDevBypass } from "@/lib/dev-mode";
import {
  addMockLearningPath,
  addMockLearningPathCourse,
  getMockCourses,
  getMockCoursesForLearningPath,
  getMockLearningPaths,
  removeMockLearningPathCourse,
} from "@/lib/mock-store";
import type { LearningPath } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";

interface LearningPathCourseView {
  id: string;
  learningPathId: string;
  courseId: string;
  courseTitle: string;
  sortOrder: number;
  required: boolean;
  completed?: boolean;
}

interface LearningPathView extends LearningPath {
  courses: LearningPathCourseView[];
}

interface LearningPathDraft {
  title: string;
  description: string;
  audience: "all" | "partner" | "major_donor" | "church" | "foundation" | "ambassador";
  estimatedHours: number;
  isActive: boolean;
}

const DEFAULT_DRAFT: LearningPathDraft = {
  title: "",
  description: "",
  audience: "all",
  estimatedHours: 8,
  isActive: true,
};

export default function AdminLearningPathsPage() {
  const { user } = useAuth();
  const { courses } = useCourses(user?.id);
  const [paths, setPaths] = useState<LearningPathView[]>([]);
  const [selectedPathId, setSelectedPathId] = useState<string>("");
  const [draft, setDraft] = useState<LearningPathDraft>(DEFAULT_DRAFT);
  const [courseToAdd, setCourseToAdd] = useState<string>("none");
  const [isRequired, setIsRequired] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedPath = useMemo(
    () => paths.find((path) => path.id === selectedPathId) ?? null,
    [paths, selectedPathId]
  );

  useEffect(() => {
    async function loadPaths() {
      setIsLoading(true);
      setError(null);

      if (isDevBypass) {
        const courseTitleMap = new Map(getMockCourses().map((course) => [course.id, course.title]));
        const rows = getMockLearningPaths().map((path) => {
          const pathCourses = getMockCoursesForLearningPath(path.id).map((entry) => ({
            id: entry.id,
            learningPathId: entry.learningPathId,
            courseId: entry.courseId,
            courseTitle: courseTitleMap.get(entry.courseId) ?? "Course",
            sortOrder: entry.sortOrder,
            required: entry.required,
            completed: false,
          }));
          return {
            ...path,
            courses: pathCourses,
            coursesCount: pathCourses.length,
          };
        });
        setPaths(rows);
        if (!selectedPathId && rows.length > 0) {
          setSelectedPathId(rows[0].id);
        }
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

      const nextPaths = json.paths ?? [];
      setPaths(nextPaths);
      if (!selectedPathId && nextPaths.length > 0) {
        setSelectedPathId(nextPaths[0].id);
      }
      setIsLoading(false);
    }

    void loadPaths();
  }, [selectedPathId]);

  async function handleCreatePath() {
    if (!user?.id || !draft.title.trim()) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);

    if (isDevBypass) {
      const now = new Date().toISOString();
      const path: LearningPathView = {
        id: `path-${Date.now()}`,
        title: draft.title.trim(),
        description: draft.description.trim() || undefined,
        audience: draft.audience,
        isActive: draft.isActive,
        estimatedHours: draft.estimatedHours,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
        courses: [],
        coursesCount: 0,
      };
      addMockLearningPath(path);
      setPaths((current) => [path, ...current]);
      setSelectedPathId(path.id);
      setDraft(DEFAULT_DRAFT);
      setMessage("Learning path created.");
      setIsSaving(false);
      return;
    }

    const response = await fetch("/api/lms/learning-paths", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: draft.title,
        description: draft.description,
        audience: draft.audience,
        estimatedHours: draft.estimatedHours,
        isActive: draft.isActive,
      }),
    });
    const json = (await response.json()) as { path?: LearningPathView; error?: string };
    if (!response.ok || !json.path) {
      setError(json.error ?? "Unable to create learning path");
      setIsSaving(false);
      return;
    }

    setPaths((current) => [json.path as LearningPathView, ...current]);
    setSelectedPathId(json.path.id);
    setDraft(DEFAULT_DRAFT);
    setMessage("Learning path created.");
    setIsSaving(false);
  }

  async function handleAddCourseToPath() {
    if (!selectedPath || courseToAdd === "none") return;
    setIsSaving(true);
    setError(null);
    setMessage(null);

    const sortOrder = (selectedPath.courses?.length ?? 0) + 1;
    if (isDevBypass) {
      const createdAt = new Date().toISOString();
      addMockLearningPathCourse({
        id: `path-course-${Date.now()}`,
        learningPathId: selectedPath.id,
        courseId: courseToAdd,
        sortOrder,
        required: isRequired,
        createdAt,
      });
      const title = courses.find((course) => course.id === courseToAdd)?.title ?? "Course";
      setPaths((current) =>
        current.map((path) =>
          path.id === selectedPath.id
            ? {
                ...path,
                courses: [
                  ...path.courses,
                  {
                    id: `path-course-${Date.now()}`,
                    learningPathId: selectedPath.id,
                    courseId: courseToAdd,
                    courseTitle: title,
                    sortOrder,
                    required: isRequired,
                  },
                ],
                coursesCount: (path.coursesCount ?? path.courses.length) + 1,
              }
            : path
        )
      );
      setMessage("Course added to learning path.");
      setCourseToAdd("none");
      setIsSaving(false);
      return;
    }

    const response = await fetch(`/api/lms/learning-paths/${selectedPath.id}/courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId: courseToAdd,
        sortOrder,
        required: isRequired,
      }),
    });
    const json = (await response.json()) as { course?: LearningPathCourseView; error?: string };
    if (!response.ok || !json.course) {
      setError(json.error ?? "Unable to add course");
      setIsSaving(false);
      return;
    }
    const createdCourse = json.course;

    const title = courses.find((course) => course.id === courseToAdd)?.title ?? "Course";
    setPaths((current) =>
      current.map((path) =>
        path.id === selectedPath.id
          ? {
              ...path,
              courses: [...path.courses, { ...createdCourse, courseTitle: title }],
              coursesCount: (path.coursesCount ?? path.courses.length) + 1,
            }
          : path
      )
    );
    setCourseToAdd("none");
    setMessage("Course added to learning path.");
    setIsSaving(false);
  }

  async function handleRemoveCourse(pathId: string, courseId: string) {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    if (isDevBypass) {
      removeMockLearningPathCourse(pathId, courseId);
      setPaths((current) =>
        current.map((path) =>
          path.id === pathId
            ? {
                ...path,
                courses: path.courses.filter((entry) => entry.courseId !== courseId),
                coursesCount: Math.max(0, (path.coursesCount ?? path.courses.length) - 1),
              }
            : path
        )
      );
      setMessage("Course removed.");
      setIsSaving(false);
      return;
    }

    const response = await fetch(`/api/lms/learning-paths/${pathId}/courses`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId }),
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(json.error ?? "Unable to remove course");
      setIsSaving(false);
      return;
    }

    setPaths((current) =>
      current.map((path) =>
        path.id === pathId
          ? {
              ...path,
              courses: path.courses.filter((entry) => entry.courseId !== courseId),
              coursesCount: Math.max(0, (path.coursesCount ?? path.courses.length) - 1),
            }
          : path
      )
    );
    setMessage("Course removed.");
    setIsSaving(false);
  }

  const availableCourses = useMemo(() => {
    if (!selectedPath) return [];
    const existingIds = new Set(selectedPath.courses.map((entry) => entry.courseId));
    return courses.filter((course) => !existingIds.has(course.id));
  }, [courses, selectedPath]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-[#1a1a1a]">Learning Paths</h1>
          <p className="text-sm text-[#666666]">
            Build certification tracks with sequenced courses and required milestones.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/courses">Back to LMS Admin</Link>
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <Card className="glass-subtle border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Create Path</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Learning path title"
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            />
            <Textarea
              rows={3}
              placeholder="Description"
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-[#8b957b]">Audience</Label>
                <Select
                  value={draft.audience}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      audience: value as LearningPathDraft["audience"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                    <SelectItem value="major_donor">Major donor</SelectItem>
                    <SelectItem value="church">Church</SelectItem>
                    <SelectItem value="foundation">Foundation</SelectItem>
                    <SelectItem value="ambassador">Ambassador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#8b957b]">Est. Hours</Label>
                <Input
                  type="number"
                  min={0}
                  value={draft.estimatedHours}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      estimatedHours: Number(event.target.value || 0),
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#d6d6cf] p-2">
              <span className="text-xs text-[#666666]">Path active</span>
              <Switch
                checked={draft.isActive}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({ ...current, isActive: checked }))
                }
              />
            </div>
            <Button
              className="w-full bg-[#2b4d24] hover:bg-[#1a3a15]"
              disabled={!draft.title.trim() || isSaving}
              onClick={() => void handleCreatePath()}
            >
              {isSaving ? "Saving..." : "Create Path"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="glass-subtle border-0">
            <CardContent className="p-4">
              <Label className="text-xs text-[#8b957b]">Select Learning Path</Label>
              <Select value={selectedPathId} onValueChange={setSelectedPathId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a path" />
                </SelectTrigger>
                <SelectContent>
                  {paths.map((path) => (
                    <SelectItem key={path.id} value={path.id}>
                      {path.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {message && (
            <Card className="border-[#2b4d24]/40 bg-[#2b4d24]/5">
              <CardContent className="p-3 text-sm text-[#2b4d24]">{message}</CardContent>
            </Card>
          )}
          {error && (
            <Card className="border-[#a36d4c]/40 bg-[#a36d4c]/10">
              <CardContent className="p-3 text-sm text-[#a36d4c]">{error}</CardContent>
            </Card>
          )}

          {isLoading ? (
            <Card>
              <CardContent className="p-5 text-sm text-[#666666]">Loading learning paths...</CardContent>
            </Card>
          ) : !selectedPath ? (
            <Card>
              <CardContent className="p-5 text-sm text-[#666666]">
                Create a learning path to begin sequencing courses.
              </CardContent>
            </Card>
          ) : (
            <Card className="glass-subtle border-0">
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                  {selectedPath.title}
                  <Badge variant={selectedPath.isActive ? "default" : "secondary"} className="text-[10px]">
                    {selectedPath.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {selectedPath.audience.replace("_", " ")}
                  </Badge>
                </CardTitle>
                <p className="text-xs text-[#666666]">
                  {selectedPath.description || "No description yet."}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-[#c5ccc2]/40 bg-white/75 p-3">
                  <p className="text-xs uppercase tracking-wide text-[#8b957b]">Add Course</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                    <Select value={courseToAdd} onValueChange={setCourseToAdd}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Choose course</SelectItem>
                        {availableCourses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2 rounded-lg border border-[#d6d6cf] px-3">
                      <Switch checked={isRequired} onCheckedChange={setIsRequired} />
                      <span className="text-xs text-[#666666]">Required</span>
                    </div>
                    <Button
                      disabled={courseToAdd === "none" || isSaving}
                      onClick={() => void handleAddCourseToPath()}
                    >
                      Add
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {selectedPath.courses.length === 0 ? (
                    <p className="text-xs text-[#999999]">No courses in this path yet.</p>
                  ) : (
                    selectedPath.courses
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((entry) => (
                        <div
                          key={entry.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#d6d6cf] bg-white/80 p-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-[#1a1a1a]">
                              {entry.sortOrder}. {entry.courseTitle}
                            </p>
                            <p className="text-xs text-[#999999]">
                              {entry.required ? "Required" : "Optional"}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isSaving}
                            onClick={() => void handleRemoveCourse(selectedPath.id, entry.courseId)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
