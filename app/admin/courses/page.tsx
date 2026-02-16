"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Course, CourseModule } from "@/types";
import {
  getMockCourses,
  getMockModules,
  getMockNotes,
  getMockProgress,
  setMockCourses,
  setMockModules,
} from "@/lib/mock-store";
import { createClient } from "@/lib/supabase/client";
import { isDevBypass } from "@/lib/dev-mode";
import { QuizBuilder } from "@/components/admin/quiz-builder";
import {
  createEmptyQuizPayload,
  isQuizPayloadReady,
  normalizeQuizPayload,
} from "@/lib/lms/quiz";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { GraduationCap, PlusCircle, Pencil, Film, FileText, Upload, ImagePlus } from "lucide-react";
import type { Json, Tables } from "@/types/database";

const ACCESS_LEVELS: Course["accessLevel"][] = [
  "partner",
  "major_donor",
  "church",
  "foundation",
  "ambassador",
];
const STATUS: Array<NonNullable<Course["status"]>> = ["draft", "published"];
const MODULE_TYPES: NonNullable<CourseModule["type"]>[] = ["video", "reading", "quiz"];

function mapCourse(row: Tables<"courses">): Course {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    thumbnailUrl: row.thumbnail_url || row.cover_image || undefined,
    accessLevel: row.access_level as Course["accessLevel"],
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    moduleCount: 0,
    status: (row.status as Course["status"]) ?? "published",
    isLocked: Boolean(row.is_locked),
    isPaid: Boolean(row.is_paid),
    price: Number(row.price ?? 0),
    tags: row.tags ?? [],
    coverImage: row.cover_image ?? "",
    enforceSequential: row.enforce_sequential ?? true,
  };
}

function mapModule(row: Tables<"course_modules">): CourseModule {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    description: row.description ?? "",
    cloudflareVideoId: row.cloudflare_video_id,
    sortOrder: row.sort_order,
    durationSeconds: row.duration_seconds,
    type: (row.module_type as CourseModule["type"]) ?? "video",
    resourceUrl: row.resource_url ?? "",
    notes: row.notes ?? "",
    passThreshold: row.pass_threshold ?? 70,
    quizPayload: row.quiz_payload ?? undefined,
  };
}

export default function AdminCoursesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newCourse, setNewCourse] = useState<Partial<Course>>({
    title: "",
    description: "",
    accessLevel: "partner",
    status: "draft",
    isLocked: false,
    isPaid: false,
    price: 0,
    tags: [],
    coverImage: "",
    enforceSequential: true,
  });
  const [moduleDraft, setModuleDraft] = useState<Record<string, Partial<CourseModule>>>({});
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [progressRows, setProgressRows] = useState<Tables<"user_course_progress">[]>([]);
  const [notesRows, setNotesRows] = useState<Tables<"user_course_notes">[]>([]);
  const [certificateRows, setCertificateRows] = useState<Tables<"user_course_certificates">[]>([]);

  const loadData = useCallback(async () => {
    setErrorMessage(null);
    if (isDevBypass) {
      const mockCourses = getMockCourses();
      const mockModules = getMockModules();
      setCourses(mockCourses);
      setModules(mockModules);

      const mockProgressRows: Tables<"user_course_progress">[] = getMockProgress().map((row) => ({
        id: row.id,
        user_id: row.userId,
        module_id: row.moduleId,
        completed: row.completed,
        completed_at: row.completedAt ?? null,
        watch_time_seconds: row.watchTimeSeconds,
        last_watched_at: row.lastWatchedAt ?? null,
      }));
      const mockNoteRows: Tables<"user_course_notes">[] = getMockNotes().map((row) => ({
        id: row.id,
        user_id: row.userId,
        module_id: row.moduleId,
        content: row.content,
        created_at: row.updatedAt,
        updated_at: row.updatedAt,
      }));
      const courseModulesMap = mockModules.reduce<Record<string, string[]>>((acc, module) => {
        acc[module.courseId] = acc[module.courseId] || [];
        acc[module.courseId].push(module.id);
        return acc;
      }, {});
      const completionByUserCourse = new Map<string, Set<string>>();
      for (const row of mockProgressRows) {
        if (!row.completed) continue;
        const moduleEntry = mockModules.find((entry) => entry.id === row.module_id);
        if (!moduleEntry) continue;
        const key = `${row.user_id}:${moduleEntry.courseId}`;
        const set = completionByUserCourse.get(key) ?? new Set<string>();
        set.add(row.module_id);
        completionByUserCourse.set(key, set);
      }
      const mockCertificates: Tables<"user_course_certificates">[] = [];
      completionByUserCourse.forEach((completedSet, key) => {
        const [userId, courseId] = key.split(":");
        const requiredModules = courseModulesMap[courseId] ?? [];
        if (requiredModules.length === 0) return;
        const completedAll = requiredModules.every((moduleId) => completedSet.has(moduleId));
        if (!completedAll) return;
        mockCertificates.push({
          id: `cert-${userId}-${courseId}`,
          user_id: userId,
          course_id: courseId,
          completion_rate: 100,
          issued_at: new Date().toISOString(),
          certificate_url: null,
          metadata: {},
        });
      });

      setProgressRows(mockProgressRows);
      setNotesRows(mockNoteRows);
      setCertificateRows(mockCertificates);
      return;
    }

    const [coursesResult, modulesResult, progressResult, notesResult, certificatesResult] = await Promise.all([
      supabase.from("courses").select("*").order("sort_order", { ascending: true }),
      supabase.from("course_modules").select("*").order("sort_order", { ascending: true }),
      supabase.from("user_course_progress").select("*"),
      supabase.from("user_course_notes").select("*"),
      supabase.from("user_course_certificates").select("*"),
    ]);

    if (coursesResult.error) {
      setErrorMessage(coursesResult.error.message);
      return;
    }

    if (modulesResult.error) {
      setErrorMessage(modulesResult.error.message);
      return;
    }
    if (progressResult.error) {
      setErrorMessage(progressResult.error.message);
      return;
    }
    if (notesResult.error) {
      setErrorMessage(notesResult.error.message);
      return;
    }
    if (certificatesResult.error) {
      setErrorMessage(certificatesResult.error.message);
      return;
    }

    setCourses((coursesResult.data ?? []).map(mapCourse));
    setModules((modulesResult.data ?? []).map(mapModule));
    setProgressRows(progressResult.data ?? []);
    setNotesRows(notesResult.data ?? []);
    setCertificateRows(certificatesResult.data ?? []);
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const modulesByCourse = useMemo(() => {
    return modules.reduce<Record<string, CourseModule[]>>((acc, module) => {
      acc[module.courseId] = acc[module.courseId] || [];
      acc[module.courseId].push(module);
      return acc;
    }, {});
  }, [modules]);

  const lmsAnalytics = useMemo(() => {
    const activeLearners = new Set(progressRows.map((row) => row.user_id)).size;
    const completedRows = progressRows.filter((row) => row.completed);
    const totalWatchSeconds = progressRows.reduce((sum, row) => sum + row.watch_time_seconds, 0);
    const avgWatchMinutes =
      progressRows.length > 0 ? Math.round(totalWatchSeconds / progressRows.length / 60) : 0;
    const certificatesIssued = certificateRows.length;

    const topCourses = courses
      .map((course) => {
        const moduleIds = (modulesByCourse[course.id] ?? []).map((module) => module.id);
        const courseRows = progressRows.filter((row) => moduleIds.includes(row.module_id));
        const uniqueLearners = new Set(courseRows.map((row) => row.user_id)).size;
        const completedModules = courseRows.filter((row) => row.completed).length;
        const denominator = uniqueLearners * Math.max(moduleIds.length, 1);
        const completionRate = denominator > 0 ? Math.round((completedModules / denominator) * 100) : 0;
        const certs = certificateRows.filter((row) => row.course_id === course.id).length;
        return {
          id: course.id,
          title: course.title,
          learners: uniqueLearners,
          completionRate,
          certificates: certs,
        };
      })
      .sort((a, b) => b.certificates - a.certificates || b.completionRate - a.completionRate)
      .slice(0, 5);

    return {
      activeLearners,
      completedRows: completedRows.length,
      notesCount: notesRows.length,
      avgWatchMinutes,
      certificatesIssued,
      topCourses,
    };
  }, [certificateRows, courses, modulesByCourse, notesRows.length, progressRows]);

  async function fileToDataUrl(file: File): Promise<string> {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  async function uploadResourceAsset(file: File): Promise<{ url: string; warning?: string }> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/admin/lms/upload/resource", {
      method: "POST",
      body: formData,
    });
    const json = (await response.json()) as { url?: string; warning?: string; error?: string };
    if (!response.ok || !json.url) {
      throw new Error(json.error || "Resource upload failed");
    }
    return { url: json.url, warning: json.warning };
  }

  async function uploadVideoToCloudflare(file: File): Promise<{ cloudflareVideoId: string }> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/admin/lms/upload/cloudflare", {
      method: "POST",
      body: formData,
    });
    const json = (await response.json()) as { cloudflareVideoId?: string; error?: string };
    if (!response.ok || !json.cloudflareVideoId) {
      throw new Error(json.error || "Cloudflare upload failed");
    }
    return { cloudflareVideoId: json.cloudflareVideoId };
  }

  async function handleNewCourseImageUpload(file: File) {
    setUploadMessage(null);
    setIsUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      setNewCourse((current) => ({ ...current, coverImage: dataUrl }));
      setUploadMessage("Course thumbnail attached.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleEditingCourseImageUpload(file: File) {
    if (!editingCourse) return;
    setUploadMessage(null);
    setIsUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      setEditingCourse((current) => (current ? { ...current, coverImage: dataUrl } : current));
      setUploadMessage("Course thumbnail attached.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDraftResourceUpload(courseId: string, file: File) {
    setUploadMessage(null);
    setIsUploading(true);
    try {
      const { url, warning } = await uploadResourceAsset(file);
      setModuleDraft((current) => ({
        ...current,
        [courseId]: {
          ...current[courseId],
          resourceUrl: url,
        },
      }));
      setUploadMessage(warning ?? "Resource uploaded.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to upload resource");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDraftVideoUpload(courseId: string, file: File) {
    setUploadMessage(null);
    setIsUploading(true);
    try {
      const { cloudflareVideoId } = await uploadVideoToCloudflare(file);
      setModuleDraft((current) => ({
        ...current,
        [courseId]: {
          ...current[courseId],
          cloudflareVideoId,
        },
      }));
      setUploadMessage("Video uploaded to Cloudflare Stream.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to upload video");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleEditingModuleResourceUpload(file: File) {
    if (!editingModule) return;
    setUploadMessage(null);
    setIsUploading(true);
    try {
      const { url, warning } = await uploadResourceAsset(file);
      setEditingModule((current) => (current ? { ...current, resourceUrl: url } : current));
      setUploadMessage(warning ?? "Resource uploaded.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to upload resource");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleEditingModuleVideoUpload(file: File) {
    if (!editingModule) return;
    setUploadMessage(null);
    setIsUploading(true);
    try {
      const { cloudflareVideoId } = await uploadVideoToCloudflare(file);
      setEditingModule((current) => (current ? { ...current, cloudflareVideoId } : current));
      setUploadMessage("Video uploaded to Cloudflare Stream.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to upload video");
    } finally {
      setIsUploading(false);
    }
  }

  async function saveCourse() {
    if (!newCourse.title || !newCourse.description) return false;

    setIsSaving(true);
    setErrorMessage(null);

    if (isDevBypass) {
      const course: Course = {
        id: `course-${Date.now()}`,
        title: newCourse.title,
        description: newCourse.description,
        accessLevel: newCourse.accessLevel ?? "partner",
        sortOrder: courses.length + 1,
        createdAt: new Date().toISOString(),
        moduleCount: 0,
        status: newCourse.status ?? "draft",
        isLocked: newCourse.isLocked ?? false,
        isPaid: newCourse.isPaid ?? false,
        price: newCourse.isPaid ? newCourse.price ?? 0 : 0,
        tags: newCourse.tags ?? [],
        coverImage: newCourse.coverImage ?? "",
        enforceSequential: newCourse.enforceSequential ?? true,
      };
      const next = [course, ...courses];
      setCourses(next);
      setMockCourses(next);
    } else {
      const { error } = await supabase.from("courses").insert({
        title: newCourse.title,
        description: newCourse.description,
        access_level: newCourse.accessLevel ?? "partner",
        sort_order: courses.length + 1,
        status: newCourse.status ?? "draft",
        is_locked: newCourse.isLocked ?? false,
        is_paid: newCourse.isPaid ?? false,
        price: newCourse.isPaid ? newCourse.price ?? 0 : 0,
        tags: newCourse.tags ?? [],
        cover_image: newCourse.coverImage || null,
        thumbnail_url: newCourse.coverImage || null,
        enforce_sequential: newCourse.enforceSequential ?? true,
      });

      if (error) {
        setErrorMessage(error.message);
        setIsSaving(false);
        return false;
      }
      await loadData();
    }

    setNewCourse({
      title: "",
      description: "",
      accessLevel: "partner",
      status: "draft",
      isLocked: false,
      isPaid: false,
      price: 0,
      tags: [],
      coverImage: "",
      enforceSequential: true,
    });
    setIsSaving(false);
    return true;
  }

  async function updateCourse() {
    if (!editingCourse) return;

    setIsSaving(true);
    setErrorMessage(null);

    if (isDevBypass) {
      const next = courses.map((course) =>
        course.id === editingCourse.id ? editingCourse : course
      );
      setCourses(next);
      setMockCourses(next);
      setEditingCourse(null);
      setIsSaving(false);
      return;
    }

    const { error } = await supabase
      .from("courses")
      .update({
        title: editingCourse.title,
        description: editingCourse.description,
        access_level: editingCourse.accessLevel,
        status: editingCourse.status ?? "draft",
        is_locked: editingCourse.isLocked ?? false,
        is_paid: editingCourse.isPaid ?? false,
        price: editingCourse.isPaid ? editingCourse.price ?? 0 : 0,
        tags: editingCourse.tags ?? [],
        cover_image: editingCourse.coverImage || null,
        thumbnail_url: editingCourse.coverImage || null,
        enforce_sequential: editingCourse.enforceSequential ?? true,
      })
      .eq("id", editingCourse.id);

    if (error) {
      setErrorMessage(error.message);
      setIsSaving(false);
      return;
    }

    setEditingCourse(null);
    await loadData();
    setIsSaving(false);
  }

  async function addModule(courseId: string) {
    const draft = moduleDraft[courseId];
    if (!draft?.title) return;

    setIsSaving(true);
    setErrorMessage(null);

    const existing = modulesByCourse[courseId] || [];
    const moduleType = draft.type ?? "video";
    const normalizedQuiz =
      moduleType === "quiz"
        ? normalizeQuizPayload(draft.quizPayload ?? createEmptyQuizPayload())
        : undefined;
    if (moduleType === "quiz" && !isQuizPayloadReady(normalizedQuiz!)) {
      setErrorMessage("Quiz modules need at least one complete question with two options.");
      setIsSaving(false);
      return;
    }
    const cloudflareVideoId =
      draft.cloudflareVideoId ||
      (moduleType === "video" ? draft.resourceUrl || "demo" : "demo");

    if (isDevBypass) {
      const newModule: CourseModule = {
        id: `${courseId}-module-${Date.now()}`,
        courseId,
        title: draft.title,
        description: draft.description || "",
        cloudflareVideoId,
        sortOrder: existing.length + 1,
        durationSeconds: draft.durationSeconds || 600,
        type: moduleType,
        resourceUrl: draft.resourceUrl,
        notes: draft.notes,
        passThreshold: draft.passThreshold ?? 70,
        quizPayload: normalizedQuiz,
      };
      const next = [newModule, ...modules];
      setModules(next);
      setMockModules(next);
    } else {
      const quizPayloadJson = (normalizedQuiz ?? null) as Json | null;
      const { error } = await supabase.from("course_modules").insert({
        course_id: courseId,
        title: draft.title,
        description: draft.description || null,
        cloudflare_video_id: cloudflareVideoId,
        sort_order: existing.length + 1,
        duration_seconds: draft.durationSeconds || 600,
        module_type: moduleType,
        resource_url: draft.resourceUrl || null,
        notes: draft.notes || null,
        pass_threshold: draft.passThreshold ?? 70,
        quiz_payload: quizPayloadJson,
      });

      if (error) {
        setErrorMessage(error.message);
        setIsSaving(false);
        return;
      }
      await loadData();
    }

    setModuleDraft({
      ...moduleDraft,
      [courseId]: {
        title: "",
        description: "",
        durationSeconds: 600,
        type: "video",
        resourceUrl: "",
        cloudflareVideoId: "",
        passThreshold: 70,
        quizPayload: createEmptyQuizPayload(),
      },
    });
    setIsSaving(false);
  }

  async function updateModule() {
    if (!editingModule) return;

    setIsSaving(true);
    setErrorMessage(null);

    if (isDevBypass) {
      const next = modules.map((module) =>
        module.id === editingModule.id ? editingModule : module
      );
      setModules(next);
      setMockModules(next);
      setEditingModule(null);
      setIsSaving(false);
      return;
    }

    const normalizedQuiz =
      editingModule.type === "quiz"
        ? normalizeQuizPayload(editingModule.quizPayload ?? createEmptyQuizPayload())
        : null;
    if (editingModule.type === "quiz" && normalizedQuiz && !isQuizPayloadReady(normalizedQuiz)) {
      setErrorMessage("Quiz modules need at least one complete question with two options.");
      setIsSaving(false);
      return;
    }

    const quizPayloadJson = normalizedQuiz as Json | null;
    const { error } = await supabase
      .from("course_modules")
      .update({
        title: editingModule.title,
        description: editingModule.description || null,
        cloudflare_video_id: editingModule.cloudflareVideoId || "demo",
        duration_seconds: editingModule.durationSeconds,
        module_type: editingModule.type ?? "video",
        resource_url: editingModule.resourceUrl || null,
        notes: editingModule.notes || null,
        pass_threshold: editingModule.passThreshold ?? 70,
        quiz_payload: quizPayloadJson,
      })
      .eq("id", editingModule.id);

    if (error) {
      setErrorMessage(error.message);
      setIsSaving(false);
        return;
    }

    setEditingModule(null);
    await loadData();
    setIsSaving(false);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-[#1a1a1a]">LMS Management</h1>
          <p className="text-sm text-[#666666]">
            Create courses, manage modules, and configure access rules.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#2b4d24] hover:bg-[#1a3a15]">
              <PlusCircle className="mr-2 h-4 w-4" /> New Course
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl glass-elevated border-0">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">Create Course</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={newCourse.title ?? ""}
                  onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newCourse.description ?? ""}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Access Level</Label>
                  <Select
                    value={newCourse.accessLevel}
                    onValueChange={(value) =>
                      setNewCourse({ ...newCourse, accessLevel: value as Course["accessLevel"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Access Level" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCESS_LEVELS.map((level) => (
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
                    value={newCourse.status}
                    onValueChange={(value) =>
                      setNewCourse({ ...newCourse, status: value as Course["status"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
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
                    value={newCourse.coverImage ?? ""}
                    onChange={(e) => setNewCourse({ ...newCourse, coverImage: e.target.value })}
                  />
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="new-course-image"
                      className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs text-[#666666]"
                    >
                      <ImagePlus className="h-3.5 w-3.5" />
                      Upload Image
                    </Label>
                    <input
                      id="new-course-image"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleNewCourseImageUpload(file);
                        e.currentTarget.value = "";
                      }}
                    />
                    {isUploading && <span className="text-[10px] text-[#999999]">Uploading...</span>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tags (comma separated)</Label>
                  <Input
                    value={(newCourse.tags ?? []).join(", ")}
                    onChange={(e) =>
                      setNewCourse({ ...newCourse, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })
                    }
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 rounded-xl glass-inset p-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newCourse.isLocked ?? false}
                    onCheckedChange={(checked) => setNewCourse({ ...newCourse, isLocked: checked })}
                  />
                  <span className="text-sm text-[#666666]">Locked course</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newCourse.isPaid ?? false}
                    onCheckedChange={(checked) => setNewCourse({ ...newCourse, isPaid: checked })}
                  />
                  <span className="text-sm text-[#666666]">Paid course</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newCourse.enforceSequential ?? true}
                    onCheckedChange={(checked) =>
                      setNewCourse({ ...newCourse, enforceSequential: checked })
                    }
                  />
                  <span className="text-sm text-[#666666]">Sequential unlock</span>
                </div>
                {newCourse.isPaid && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-[#999999]">Price</Label>
                    <Input
                      type="number"
                      className="w-28"
                      value={newCourse.price ?? 0}
                      onChange={(e) => setNewCourse({ ...newCourse, price: Number(e.target.value) })}
                    />
                  </div>
                )}
              </div>
              <Button
                className="w-full bg-[#2b4d24] hover:bg-[#1a3a15]"
                disabled={isSaving}
                onClick={async () => {
                  const ok = await saveCourse();
                  if (ok) setCreateOpen(false);
                }}
              >
                {isSaving ? "Saving..." : "Save Course"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-[#a36d4c]/30 bg-[#a36d4c]/10 px-4 py-3 text-sm text-[#7a5038]">
          {errorMessage}
        </div>
      )}
      {uploadMessage && (
        <div className="rounded-xl border border-[#2b4d24]/20 bg-[#2b4d24]/5 px-4 py-3 text-sm text-[#2b4d24]">
          {uploadMessage}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Active Learners", value: lmsAnalytics.activeLearners },
          { label: "Module Completions", value: lmsAnalytics.completedRows },
          { label: "Notes Saved", value: lmsAnalytics.notesCount },
          { label: "Avg Watch (min)", value: lmsAnalytics.avgWatchMinutes },
          { label: "Certificates", value: lmsAnalytics.certificatesIssued },
        ].map((metric) => (
          <Card key={metric.label} className="glass-subtle border-0">
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-wide text-[#8b957b]">{metric.label}</p>
              <p className="mt-1 text-2xl font-semibold text-[#1a1a1a]">{metric.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {lmsAnalytics.topCourses.length > 0 && (
        <Card className="glass-subtle border-0">
          <CardHeader className="pb-2">
            <CardTitle className="font-serif text-lg">Top Course Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lmsAnalytics.topCourses.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#c5ccc2]/50 px-3 py-2"
              >
                <span className="text-sm text-[#1a1a1a]">{row.title}</span>
                <span className="text-xs text-[#666666]">
                  {row.learners} learners • {row.completionRate}% completion • {row.certificates} certificates
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {courses.map((course) => {
          const courseModules = modulesByCourse[course.id] || [];
          return (
            <Card key={course.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="font-serif text-xl">{course.title}</CardTitle>
                    <p className="text-sm text-[#666666]">{course.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-[10px] text-[#8b957b]">
                      {course.accessLevel.replace("_", " ")}
                    </Badge>
                    {course.status && (
                      <Badge variant="secondary" className="text-[10px]">
                        {course.status}
                      </Badge>
                    )}
                    {course.isLocked && (
                      <Badge className="text-[10px] bg-[#2b4d24]/10 text-[#2b4d24]">Locked</Badge>
                    )}
                    {course.isPaid && (
                      <Badge className="text-[10px] bg-[#e1a730]/10 text-[#a36d4c]">
                        Paid - ${course.price ?? 0}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-[#999999]">
                  <GraduationCap className="h-4 w-4 text-[#2b4d24]" />
                  {courseModules.length} modules
                </div>
                <div className="space-y-3">
                  {courseModules.map((module) => (
                    <div key={module.id} className="rounded-xl glass-inset p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-[#1a1a1a]">{module.title}</p>
                          <p className="text-xs text-[#999999]">{module.description}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingModule(module)}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-[#8b957b]">
                        <Badge variant="outline" className="text-[10px]">
                          {(module.type ?? "video").toUpperCase()}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {Math.round(module.durationSeconds / 60)} min
                        </Badge>
                        {module.resourceUrl && (
                          <Badge variant="secondary" className="text-[10px]">
                            Resource linked
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {courseModules.length === 0 && (
                    <p className="text-xs text-[#999999]">No modules yet.</p>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
                  <div className="space-y-2">
                    <Label>Add Module Title</Label>
                    <Input
                      value={moduleDraft[course.id]?.title ?? ""}
                      onChange={(e) =>
                        setModuleDraft({
                          ...moduleDraft,
                          [course.id]: { ...moduleDraft[course.id], title: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (sec)</Label>
                    <Input
                      type="number"
                      value={moduleDraft[course.id]?.durationSeconds ?? 600}
                      onChange={(e) =>
                        setModuleDraft({
                          ...moduleDraft,
                          [course.id]: {
                            ...moduleDraft[course.id],
                            durationSeconds: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Module Type</Label>
                    <Select
                      value={moduleDraft[course.id]?.type ?? "video"}
                      onValueChange={(value) =>
                        setModuleDraft({
                          ...moduleDraft,
                          [course.id]: { ...moduleDraft[course.id], type: value as CourseModule["type"] },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {MODULE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Resource URL</Label>
                    <Input
                      value={moduleDraft[course.id]?.resourceUrl ?? ""}
                      onChange={(e) =>
                        setModuleDraft({
                          ...moduleDraft,
                          [course.id]: { ...moduleDraft[course.id], resourceUrl: e.target.value },
                        })
                      }
                    />
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={`resource-upload-${course.id}`}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs text-[#666666]"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Upload Resource
                      </Label>
                      <input
                        id={`resource-upload-${course.id}`}
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleDraftResourceUpload(course.id, file);
                          e.currentTarget.value = "";
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Cloudflare Stream ID</Label>
                    <Input
                      placeholder="For video modules"
                      value={moduleDraft[course.id]?.cloudflareVideoId ?? ""}
                      onChange={(e) =>
                        setModuleDraft({
                          ...moduleDraft,
                          [course.id]: {
                            ...moduleDraft[course.id],
                            cloudflareVideoId: e.target.value,
                          },
                        })
                      }
                    />
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={`video-upload-${course.id}`}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs text-[#666666]"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Upload Video
                      </Label>
                      <input
                        id={`video-upload-${course.id}`}
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleDraftVideoUpload(course.id, file);
                          e.currentTarget.value = "";
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Quiz Pass %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={moduleDraft[course.id]?.passThreshold ?? 70}
                      onChange={(e) =>
                        setModuleDraft({
                          ...moduleDraft,
                          [course.id]: {
                            ...moduleDraft[course.id],
                            passThreshold: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                </div>
                {(moduleDraft[course.id]?.type ?? "video") === "quiz" && (
                  <QuizBuilder
                    payload={normalizeQuizPayload(
                      moduleDraft[course.id]?.quizPayload ?? createEmptyQuizPayload()
                    )}
                    onChange={(payload) =>
                      setModuleDraft((current) => ({
                        ...current,
                        [course.id]: {
                          ...current[course.id],
                          quizPayload: payload,
                        },
                      }))
                    }
                  />
                )}
                <div className="space-y-2">
                  <Label>Module Notes (optional)</Label>
                  <Textarea
                    value={moduleDraft[course.id]?.notes ?? ""}
                    onChange={(e) =>
                      setModuleDraft({
                        ...moduleDraft,
                        [course.id]: { ...moduleDraft[course.id], notes: e.target.value },
                      })
                    }
                  />
                </div>
                <Button variant="outline" disabled={isSaving} onClick={() => void addModule(course.id)}>
                  {isSaving ? "Saving..." : "Add Module"}
                </Button>
                <Button
                  variant="ghost"
                  className="text-[#2b4d24]"
                  onClick={() => setEditingCourse(course)}
                >
                  <Pencil className="mr-2 h-4 w-4" /> Edit course settings
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={Boolean(editingCourse)} onOpenChange={(open) => !open && setEditingCourse(null)}>
        <DialogContent className="max-w-xl glass-elevated border-0">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Edit Course</DialogTitle>
          </DialogHeader>
          {editingCourse && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editingCourse.title}
                  onChange={(e) => setEditingCourse({ ...editingCourse, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingCourse.description}
                  onChange={(e) => setEditingCourse({ ...editingCourse, description: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editingCourse.status ?? "draft"}
                    onValueChange={(value) => setEditingCourse({ ...editingCourse, status: value as Course["status"] })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Access Level</Label>
                  <Select
                    value={editingCourse.accessLevel}
                    onValueChange={(value) =>
                      setEditingCourse({ ...editingCourse, accessLevel: value as Course["accessLevel"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Access Level" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCESS_LEVELS.map((level) => (
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
                    value={editingCourse.coverImage ?? ""}
                    onChange={(e) => setEditingCourse({ ...editingCourse, coverImage: e.target.value })}
                  />
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="edit-course-image"
                      className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs text-[#666666]"
                    >
                      <ImagePlus className="h-3.5 w-3.5" />
                      Upload Image
                    </Label>
                    <input
                      id="edit-course-image"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleEditingCourseImageUpload(file);
                        e.currentTarget.value = "";
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <Input
                    value={(editingCourse.tags ?? []).join(", ")}
                    onChange={(e) =>
                      setEditingCourse({
                        ...editingCourse,
                        tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 rounded-xl glass-inset p-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingCourse.isLocked ?? false}
                    onCheckedChange={(checked) => setEditingCourse({ ...editingCourse, isLocked: checked })}
                  />
                  <span className="text-sm text-[#666666]">Locked course</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingCourse.isPaid ?? false}
                    onCheckedChange={(checked) => setEditingCourse({ ...editingCourse, isPaid: checked })}
                  />
                  <span className="text-sm text-[#666666]">Paid course</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingCourse.enforceSequential ?? true}
                    onCheckedChange={(checked) =>
                      setEditingCourse({ ...editingCourse, enforceSequential: checked })
                    }
                  />
                  <span className="text-sm text-[#666666]">Sequential unlock</span>
                </div>
                {editingCourse.isPaid && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-[#999999]">Price</Label>
                    <Input
                      type="number"
                      className="w-28"
                      value={editingCourse.price ?? 0}
                      onChange={(e) => setEditingCourse({ ...editingCourse, price: Number(e.target.value) })}
                    />
                  </div>
                )}
              </div>
              <Button
                className="w-full bg-[#2b4d24] hover:bg-[#1a3a15]"
                disabled={isSaving}
                onClick={() => void updateCourse()}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingModule)} onOpenChange={(open) => !open && setEditingModule(null)}>
        <DialogContent className="max-w-lg glass-elevated border-0">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Edit Module</DialogTitle>
          </DialogHeader>
          {editingModule && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editingModule.title}
                  onChange={(e) => setEditingModule({ ...editingModule, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingModule.description ?? ""}
                  onChange={(e) => setEditingModule({ ...editingModule, description: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={editingModule.type ?? "video"}
                    onValueChange={(value) =>
                      setEditingModule({ ...editingModule, type: value as CourseModule["type"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {MODULE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Duration (sec)</Label>
                  <Input
                    type="number"
                    value={editingModule.durationSeconds}
                    onChange={(e) =>
                      setEditingModule({ ...editingModule, durationSeconds: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Resource URL</Label>
                <Input
                  value={editingModule.resourceUrl ?? ""}
                  onChange={(e) =>
                    setEditingModule({ ...editingModule, resourceUrl: e.target.value })
                  }
                />
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="edit-module-resource-upload"
                    className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs text-[#666666]"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload Resource
                  </Label>
                  <input
                    id="edit-module-resource-upload"
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleEditingModuleResourceUpload(file);
                      e.currentTarget.value = "";
                    }}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Cloudflare Stream ID</Label>
                  <Input
                    value={editingModule.cloudflareVideoId ?? ""}
                    onChange={(e) =>
                      setEditingModule({ ...editingModule, cloudflareVideoId: e.target.value })
                    }
                  />
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="edit-module-video-upload"
                      className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs text-[#666666]"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Upload Video
                    </Label>
                    <input
                      id="edit-module-video-upload"
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleEditingModuleVideoUpload(file);
                        e.currentTarget.value = "";
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Quiz Pass %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={editingModule.passThreshold ?? 70}
                    onChange={(e) =>
                      setEditingModule({ ...editingModule, passThreshold: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              {(editingModule.type ?? "video") === "quiz" && (
                <QuizBuilder
                  payload={normalizeQuizPayload(editingModule.quizPayload ?? createEmptyQuizPayload())}
                  onChange={(payload) =>
                    setEditingModule((current) =>
                      current
                        ? {
                            ...current,
                            quizPayload: payload,
                          }
                        : current
                    )
                  }
                />
              )}
              <div className="space-y-2">
                <Label>Module Notes</Label>
                <Textarea
                  value={editingModule.notes ?? ""}
                  onChange={(e) =>
                    setEditingModule({ ...editingModule, notes: e.target.value })
                  }
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-[#999999]">
                <Film className="h-3.5 w-3.5" /> Video modules can point to Cloudflare Stream IDs.
              </div>
              <div className="flex items-center gap-2 text-xs text-[#999999]">
                <FileText className="h-3.5 w-3.5" /> Reading modules can link PDFs or docs.
              </div>
              <Button
                className="w-full bg-[#2b4d24] hover:bg-[#1a3a15]"
                disabled={isSaving}
                onClick={() => void updateModule()}
              >
                {isSaving ? "Saving..." : "Save Module"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
