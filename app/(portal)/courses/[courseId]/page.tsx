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
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/portal/empty-state";
import { createClient } from "@/lib/supabase/client";
import { getStreamUrl } from "@/lib/cloudflare/client";
import { QuizResult, gradeQuiz, normalizeQuizPayload } from "@/lib/lms/quiz";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Download,
  Lock,
  PlayCircle,
} from "lucide-react";
import { getMockNoteForModule, upsertMockNote } from "@/lib/mock-store";
import { isDevBypass } from "@/lib/dev-mode";

function sanitizeFilename(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function CourseDetailPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params?.courseId;
  const { user } = useAuth();
  const { courses, modules, progress, isLoading, updateProgress } = useCourses(user?.id);
  const supabase = useMemo(() => createClient(), []);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState("");
  const [noteId, setNoteId] = useState<string | null>(null);
  const [noteUpdatedAt, setNoteUpdatedAt] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteSaved, setNoteSaved] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [certificateIssuedAt, setCertificateIssuedAt] = useState<string | null>(null);
  const [certificateError, setCertificateError] = useState<string | null>(null);

  const course = useMemo(
    () => courses.find((c) => c.id === courseId),
    [courses, courseId]
  );

  const courseModules = useMemo(
    () =>
      modules
        .filter((m) => m.courseId === courseId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [modules, courseId]
  );

  const progressMap = useMemo(() => {
    return new Map(progress.map((p) => [p.moduleId, p]));
  }, [progress]);

  const moduleUnlockMap = useMemo(() => {
    if (course?.enforceSequential === false) {
      return courseModules.reduce<Map<string, boolean>>((acc, module) => {
        acc.set(module.id, true);
        return acc;
      }, new Map<string, boolean>());
    }

    return courseModules.reduce<Map<string, boolean>>((acc, module, index) => {
      if (index === 0) {
        acc.set(module.id, true);
        return acc;
      }
      const previousModule = courseModules[index - 1];
      const previousCompleted = Boolean(progressMap.get(previousModule.id)?.completed);
      acc.set(module.id, previousCompleted);
      return acc;
    }, new Map<string, boolean>());
  }, [course?.enforceSequential, courseModules, progressMap]);

  const firstUnlockedModuleId = useMemo(() => {
    return (
      courseModules.find((module) => moduleUnlockMap.get(module.id))?.id ??
      courseModules[0]?.id ??
      null
    );
  }, [courseModules, moduleUnlockMap]);

  const completedCount = courseModules.filter((m) => progressMap.get(m.id)?.completed).length;
  const totalCount = courseModules.length || 0;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isCourseComplete = totalCount > 0 && completedCount === totalCount;
  const streamSubdomain = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN;

  useEffect(() => {
    if (courseModules.length === 0) return;
    const activeIsUnlocked = activeModuleId ? moduleUnlockMap.get(activeModuleId) : false;
    if (!activeModuleId || !activeIsUnlocked) {
      setActiveModuleId(firstUnlockedModuleId ?? courseModules[0].id);
    }
  }, [activeModuleId, courseModules, firstUnlockedModuleId, moduleUnlockMap]);

  useEffect(() => {
    if (!user || !activeModuleId) return;
    const currentUserId = user.id;
    const currentModuleId = activeModuleId;

    async function loadNote() {
      setNoteError(null);

      if (isDevBypass) {
        const existing = getMockNoteForModule(currentUserId, currentModuleId);
        setNoteValue(existing?.content ?? "");
        setNoteId(existing?.id ?? null);
        setNoteUpdatedAt(existing?.updatedAt ?? null);
        setNoteSaved(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_course_notes")
        .select("*")
        .eq("user_id", currentUserId)
        .eq("module_id", currentModuleId)
        .maybeSingle();

      if (error) {
        setNoteError("Unable to load saved notes right now.");
        return;
      }

      setNoteValue(data?.content ?? "");
      setNoteId(data?.id ?? null);
      setNoteUpdatedAt(data?.updated_at ?? null);
      setNoteSaved(false);
    }

    void loadNote();
  }, [activeModuleId, supabase, user]);

  useEffect(() => {
    setQuizAnswers({});
    setQuizResult(null);
    setQuizError(null);
  }, [activeModuleId]);

  useEffect(() => {
    if (!user || !course || !isCourseComplete) return;
    if (isDevBypass) {
      setCertificateIssuedAt(new Date().toISOString());
      return;
    }

    const currentUserId = user.id;
    const currentCourseId = course.id;
    const currentCourseTitle = course.title;
    const currentModuleCount = courseModules.length;

    async function issueCertificate() {
      setCertificateError(null);
      const issuedAt = new Date().toISOString();
      const { data, error } = await supabase
        .from("user_course_certificates")
        .upsert(
          {
            user_id: currentUserId,
            course_id: currentCourseId,
            completion_rate: 100,
            issued_at: issuedAt,
            metadata: {
              courseTitle: currentCourseTitle,
              moduleCount: currentModuleCount,
            },
          },
          { onConflict: "user_id,course_id" }
        )
        .select("*")
        .single();

      if (error) {
        setCertificateError("Unable to issue certificate right now.");
        return;
      }

      setCertificateIssuedAt(data.issued_at ?? issuedAt);
    }

    void issueCertificate();
  }, [course, courseModules.length, isCourseComplete, supabase, user]);

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

  const activeModule = courseModules.find((m) => m.id === activeModuleId) ?? courseModules[0];
  const activeProgress = activeModule ? progressMap.get(activeModule.id) : undefined;
  const activeModuleType = activeModule?.type ?? "video";
  const canPersistNotes = Boolean(user?.id && activeModule?.id);
  const activeModuleUnlocked = activeModule ? Boolean(moduleUnlockMap.get(activeModule.id)) : false;
  const activeQuizPayload =
    activeModuleType === "quiz" ? normalizeQuizPayload(activeModule?.quizPayload) : null;
  const activeModuleIndex = activeModule
    ? courseModules.findIndex((module) => module.id === activeModule.id)
    : -1;
  const nextModule =
    activeModuleIndex >= 0 && activeModuleIndex < courseModules.length - 1
      ? courseModules[activeModuleIndex + 1]
      : undefined;

  function saveNote() {
    if (!user || !activeModule) return;
    const currentUserId = user.id;

    async function persistNote() {
      setNoteError(null);
      const now = new Date().toISOString();

      if (isDevBypass) {
        const entry = {
          id: noteId ?? `note-${Date.now()}`,
          userId: currentUserId,
          moduleId: activeModule.id,
          content: noteValue.trim(),
          updatedAt: now,
        };
        upsertMockNote(entry);
        setNoteId(entry.id);
        setNoteUpdatedAt(entry.updatedAt);
        setNoteSaved(true);
        setTimeout(() => setNoteSaved(false), 2000);
        return;
      }

      const { data, error } = await supabase
        .from("user_course_notes")
        .upsert(
          {
            id: noteId ?? undefined,
            user_id: currentUserId,
            module_id: activeModule.id,
            content: noteValue.trim(),
            updated_at: now,
          },
          { onConflict: "user_id,module_id" }
        )
        .select("*")
        .single();

      if (error) {
        setNoteError("We could not save this note. Please try again.");
        return;
      }

      setNoteId(data.id);
      setNoteUpdatedAt(data.updated_at);
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    }

    void persistNote();
  }

  function submitQuizAttempt() {
    if (!activeModule || !activeQuizPayload) return;
    if (!activeModuleUnlocked) return;

    const unanswered = activeQuizPayload.questions.filter(
      (question) => quizAnswers[question.id] === undefined
    );
    if (unanswered.length > 0) {
      setQuizError("Please answer every question before submitting.");
      return;
    }

    const result = gradeQuiz(
      activeQuizPayload,
      quizAnswers,
      activeModule.passThreshold ?? 70
    );
    setQuizResult(result);
    setQuizError(null);
    if (result.passed) {
      void updateProgress(activeModule.id, {
        completed: true,
        watchTimeSeconds: activeModule.durationSeconds,
      });
    }
  }

  function downloadCertificate() {
    if (!isCourseComplete || !course) return;
    const issuedDate = certificateIssuedAt
      ? new Date(certificateIssuedAt).toLocaleDateString()
      : new Date().toLocaleDateString();
    const name = user ? `${user.firstName} ${user.lastName}` : "Favor Partner";
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Favor Certificate</title>
  <style>
    body { font-family: Georgia, serif; background: #f5f3ef; margin: 0; padding: 48px; }
    .card { background: #fffef9; border: 2px solid #2b4d24; border-radius: 16px; padding: 36px; text-align: center; }
    .brand { color: #2b4d24; letter-spacing: 2px; font-size: 12px; text-transform: uppercase; }
    h1 { color: #1a1a1a; margin: 16px 0 8px; font-size: 40px; }
    .name { font-size: 30px; color: #2b4d24; margin: 20px 0; }
    .course { font-size: 20px; color: #333; margin: 8px 0 20px; }
    .meta { color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">Favor International</div>
    <h1>Certificate of Completion</h1>
    <div class="meta">This certifies that</div>
    <div class="name">${name}</div>
    <div class="meta">has successfully completed</div>
    <div class="course">${course.title}</div>
    <div class="meta">Issued on ${issuedDate}</div>
  </div>
</body>
</html>`;
    downloadTextFile(`${sanitizeFilename(course.title)}-certificate.html`, html);
  }

  function downloadActiveNote() {
    if (!course || !activeModule || !noteValue.trim()) return;
    const safeCourseTitle = sanitizeFilename(course.title);
    const safeModuleTitle = sanitizeFilename(activeModule.title);
    const body = [
      `Course: ${course.title}`,
      `Module: ${activeModule.title}`,
      `Downloaded: ${new Date().toLocaleString()}`,
      "",
      noteValue.trim(),
    ].join("\n");
    downloadTextFile(`${safeCourseTitle}-${safeModuleTitle}-notes.txt`, body);
  }

  function downloadCompletionSummary() {
    if (!isCourseComplete || !course) return;
    const moduleLines = courseModules.map((module, index) => {
      const moduleProgress = progressMap.get(module.id);
      const state = moduleProgress?.completed ? "Completed" : "Incomplete";
      return `${index + 1}. ${module.title} - ${state}`;
    });
    const body = [
      "Favor Course Completion Summary",
      `Learner: ${user ? `${user.firstName} ${user.lastName}` : "Unknown User"}`,
      `Email: ${user?.email ?? "Unknown"}`,
      `Course: ${course.title}`,
      `Completed On: ${new Date().toLocaleDateString()}`,
      `Completion Rate: ${completionRate}%`,
      "",
      ...moduleLines,
    ].join("\n");
    downloadTextFile(`${sanitizeFilename(course.title)}-completion-summary.txt`, body);
  }

  function getCompletionButtonText() {
    if (activeProgress?.completed) return "Mark Incomplete";
    if (activeModuleType === "reading") return "Mark Reading Complete";
    if (activeModuleType === "quiz") return "Mark Quiz Complete";
    return "Mark Video Complete";
  }

  function goToNextModule() {
    if (!nextModule) return;
    if (!activeProgress?.completed) return;
    if (!moduleUnlockMap.get(nextModule.id)) return;
    setActiveModuleId(nextModule.id);
  }

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

      {isCourseComplete && (
        <Card className="border-[#2b4d24]/20 bg-[#2b4d24]/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="text-sm font-medium text-[#1a1a1a]">Course complete</p>
              <p className="text-xs text-[#666666]">
                You have finished all modules in this course.
              </p>
            </div>
            <Button variant="outline" onClick={downloadCompletionSummary}>
              <Download className="mr-2 h-4 w-4" />
              Download Completion Summary
            </Button>
            <Button variant="outline" onClick={downloadCertificate}>
              <Download className="mr-2 h-4 w-4" />
              Download Certificate
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Card className="glass-pane">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-lg">Modules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {courseModules.map((module, index) => {
              const isActive = module.id === activeModule?.id;
              const isComplete = progressMap.get(module.id)?.completed;
              const isUnlocked = moduleUnlockMap.get(module.id) ?? false;
              return (
                <button
                  key={module.id}
                  onClick={() => {
                    if (isUnlocked) setActiveModuleId(module.id);
                  }}
                  disabled={!isUnlocked}
                  className={`w-full rounded-xl p-3 text-left glass-transition ${
                    isActive ? "border border-[#2b4d24]/20 bg-[#2b4d24]/10" : "glass-inset"
                  } ${!isUnlocked ? "cursor-not-allowed opacity-70" : ""}`}
                  aria-label={
                    isUnlocked
                      ? `Open module ${index + 1}`
                      : `Module ${index + 1} is locked until previous module is complete`
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-[#999999]">Module {index + 1}</p>
                      <p className="text-sm font-medium text-[#1a1a1a]">{module.title}</p>
                    </div>
                    {isComplete ? (
                      <CheckCircle2 className="h-4 w-4 text-[#2b4d24]" />
                    ) : isUnlocked ? (
                      <PlayCircle className="h-4 w-4 text-[#c5ccc2]" />
                    ) : (
                      <Lock className="h-4 w-4 text-[#c5ccc2]" />
                    )}
                  </div>
                  {module.description && (
                    <p className="mt-1 text-xs text-[#999999] line-clamp-2">{module.description}</p>
                  )}
                  {!isUnlocked && (
                    <p className="mt-1 text-[10px] text-[#999999]">
                      Complete the previous module to unlock this lesson.
                    </p>
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
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] text-[#8b957b]">
                    {(activeModule?.type ?? "video").toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] text-[#8b957b]">
                    {activeModule ? Math.round(activeModule.durationSeconds / 60) : 0} min
                  </Badge>
                </div>
              </div>
              {!activeModuleUnlocked && (
                <p className="text-xs text-[#a36d4c]">
                  This module is locked until previous content is completed.
                </p>
              )}
              {activeModuleType === "video" && activeModule?.cloudflareVideoId && streamSubdomain && !activeModule.cloudflareVideoId.startsWith("demo") && (
                <div className="overflow-hidden rounded-xl border border-[#c5ccc2]/40">
                  <iframe
                    src={getStreamUrl(activeModule.cloudflareVideoId)}
                    title={activeModule.title}
                    className="h-[360px] w-full"
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                    allowFullScreen
                  />
                </div>
              )}
              {activeModuleType === "quiz" && activeQuizPayload && (
                <div className="space-y-4 rounded-xl border border-[#c5ccc2]/50 bg-white/70 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[#8b957b]">
                      Knowledge Check
                    </p>
                    <p className="text-sm text-[#666666]">
                      Pass score: {activeModule?.passThreshold ?? 70}%
                    </p>
                  </div>
                  {activeQuizPayload.questions.map((question, idx) => (
                    <div key={question.id} className="space-y-2 rounded-lg border border-[#c5ccc2]/40 bg-white p-3">
                      <p className="text-sm font-medium text-[#1a1a1a]">
                        {idx + 1}. {question.prompt || "Untitled question"}
                      </p>
                      <div className="space-y-2">
                        {question.options.map((option, optionIdx) => (
                          <button
                            key={`${question.id}-option-${optionIdx}`}
                            type="button"
                            onClick={() =>
                              setQuizAnswers((current) => ({
                                ...current,
                                [question.id]: optionIdx,
                              }))
                            }
                            className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                              quizAnswers[question.id] === optionIdx
                                ? "border-[#2b4d24] bg-[#2b4d24]/10 text-[#1a1a1a]"
                                : "border-[#d8d8d8] bg-white text-[#666666]"
                            }`}
                          >
                            {option || `Option ${optionIdx + 1}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="outline" onClick={submitQuizAttempt} disabled={!activeModuleUnlocked}>
                      Submit Quiz
                    </Button>
                    {quizResult && (
                      <span className={quizResult.passed ? "text-sm text-[#2b4d24]" : "text-sm text-[#a36d4c]"}>
                        Score: {quizResult.scorePercent}% ({quizResult.correctAnswers}/{quizResult.totalQuestions}){" "}
                        {quizResult.passed ? "- Passed" : "- Try again"}
                      </span>
                    )}
                  </div>
                  {quizError && <p className="text-xs text-[#a36d4c]">{quizError}</p>}
                </div>
              )}
              <p className="text-sm text-[#666666]">
                {activeModule?.description || "Follow along with this module to deepen your understanding."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="bg-[#2b4d24] hover:bg-[#1a3a15]"
                  disabled={!activeModule || !activeModuleUnlocked}
                  onClick={() => {
                    if (!activeModule || !activeModuleUnlocked) return;
                    const nextCompleted = !activeProgress?.completed;
                    const watchTime = nextCompleted
                      ? Math.max(activeModule.durationSeconds, activeProgress?.watchTimeSeconds ?? 0)
                      : activeProgress?.watchTimeSeconds ?? 0;
                    void updateProgress(activeModule.id, {
                      completed: nextCompleted,
                      watchTimeSeconds: watchTime,
                    });
                  }}
                >
                  {getCompletionButtonText()}
                </Button>
                {activeModule?.resourceUrl && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(activeModule.resourceUrl, "_blank", "noopener,noreferrer")}
                  >
                    Open Resource
                  </Button>
                )}
                {nextModule && (
                  <Button
                    variant="outline"
                    onClick={goToNextModule}
                    disabled={!activeProgress?.completed}
                  >
                    Next Module
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
                <Button variant="outline" onClick={downloadActiveNote} disabled={!noteValue.trim()}>
                  <Download className="mr-2 h-4 w-4" />
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
              <Textarea
                value={noteValue}
                onChange={(e) => setNoteValue(e.target.value)}
                placeholder="Write down key takeaways, prayer requests, or follow-up ideas..."
                rows={5}
                className="bg-white/70"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#999999]">
                <span>
                  {canPersistNotes && noteUpdatedAt
                    ? `Last saved ${new Date(noteUpdatedAt).toLocaleString()}`
                    : canPersistNotes
                      ? "Not saved yet"
                      : "Sign in to save notes."}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveNote}
                  disabled={!canPersistNotes}
                  className={noteSaved ? "border-[#2b4d24] text-[#2b4d24]" : ""}
                >
                  {noteSaved ? "Saved" : "Save Note"}
                </Button>
              </div>
              {noteError && <p className="text-xs text-[#a36d4c]">{noteError}</p>}
              {certificateError && <p className="text-xs text-[#a36d4c]">{certificateError}</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
