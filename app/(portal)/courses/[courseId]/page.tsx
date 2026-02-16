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
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/portal/empty-state";
import { CourseAssignmentsPanel } from "@/components/courses/course-assignments-panel";
import { createClient } from "@/lib/supabase/client";
import { getStreamUrl } from "@/lib/cloudflare/client";
import { hasAdminPermission } from "@/lib/admin/roles";
import {
  QuizResult,
  createQuizSession,
  gradeQuizSession,
  normalizeQuizPayload,
} from "@/lib/lms/quiz";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Download,
  Lock,
  MessageSquare,
  Pin,
  PlayCircle,
} from "lucide-react";
import {
  addMockCohort,
  addMockDiscussionReply,
  addMockDiscussionThread,
  addMockQuizAttempt,
  getMockCohortMembers,
  getMockCohortsForCourse,
  getMockDiscussionRepliesForThread,
  getMockDiscussionThreadsForCourse,
  getMockNoteForModule,
  getMockQuizAttemptsForModule,
  joinMockCohort,
  leaveMockCohort,
  recordMockModuleEvent,
  updateMockDiscussionThread,
  upsertMockNote,
} from "@/lib/mock-store";
import { isDevBypass } from "@/lib/dev-mode";
import type {
  CourseCohort,
  CourseDiscussionReply,
  CourseDiscussionThread,
  UserQuizAttempt,
} from "@/types";

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

function formatDateTime(value: string | undefined | null) {
  if (!value) return "TBD";
  return new Date(value).toLocaleString();
}

let localIdCounter = 0;
function nextLocalId(prefix: string) {
  localIdCounter += 1;
  return `${prefix}-${localIdCounter}`;
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
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [quizSessionSeed, setQuizSessionSeed] = useState("");
  const [quizAttemptStartedAt, setQuizAttemptStartedAt] = useState<string | null>(null);
  const [quizAttempts, setQuizAttempts] = useState<UserQuizAttempt[]>([]);
  const [quizAttemptError, setQuizAttemptError] = useState<string | null>(null);
  const [certificateIssuedAt, setCertificateIssuedAt] = useState<string | null>(null);
  const [certificateError, setCertificateError] = useState<string | null>(null);
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
  const [certificateVerificationUrl, setCertificateVerificationUrl] = useState<string | null>(null);
  const [certificateNumber, setCertificateNumber] = useState<string | null>(null);
  const [courseCohorts, setCourseCohorts] = useState<CourseCohort[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<string | null>(null);
  const [cohortError, setCohortError] = useState<string | null>(null);
  const [cohortLoading, setCohortLoading] = useState(false);
  const [newCohortName, setNewCohortName] = useState("");
  const [newCohortDescription, setNewCohortDescription] = useState("");
  const [threadTitle, setThreadTitle] = useState("");
  const [threadBody, setThreadBody] = useState("");
  const [threadError, setThreadError] = useState<string | null>(null);
  const [discussionLoading, setDiscussionLoading] = useState(false);
  const [discussionThreads, setDiscussionThreads] = useState<CourseDiscussionThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [repliesByThreadId, setRepliesByThreadId] = useState<Record<string, CourseDiscussionReply[]>>({});
  const [replyDraftByThreadId, setReplyDraftByThreadId] = useState<Record<string, string>>({});
  const [replyError, setReplyError] = useState<string | null>(null);
  const canManageLms = hasAdminPermission("lms:manage", user?.permissions);

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
  const selectedCohort = useMemo(
    () => courseCohorts.find((cohort) => cohort.id === selectedCohortId) ?? null,
    [courseCohorts, selectedCohortId]
  );

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
    setQuizAttemptError(null);
    setQuizSessionSeed(`${activeModuleId ?? "module"}:${user?.id ?? "anonymous"}:${Date.now()}`);
    setQuizAttemptStartedAt(new Date().toISOString());

    async function loadQuizAttempts() {
      if (!user?.id || !activeModuleId) {
        setQuizAttempts([]);
        return;
      }

      if (isDevBypass) {
        setQuizAttempts(getMockQuizAttemptsForModule(user.id, activeModuleId));
        return;
      }

      const { data, error } = await supabase
        .from("user_quiz_attempts")
        .select("*")
        .eq("user_id", user.id)
        .eq("module_id", activeModuleId)
        .order("attempt_number", { ascending: false });

      if (error) {
        setQuizAttemptError("Unable to load quiz attempt history.");
        setQuizAttempts([]);
        return;
      }

      const attempts = (data ?? []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        courseId: row.course_id,
        moduleId: row.module_id,
        attemptNumber: row.attempt_number,
        scorePercent: row.score_percent,
        correctAnswers: row.correct_answers,
        totalQuestions: row.total_questions,
        passed: row.passed,
        answers: (row.answers as Record<string, string | number>) ?? {},
        questionOrder: row.question_order ?? [],
        optionOrder: (row.option_order as Record<string, number[]>) ?? {},
        startedAt: row.started_at,
        submittedAt: row.submitted_at,
        durationSeconds: row.duration_seconds,
        metadata:
          row.metadata && typeof row.metadata === "object"
            ? (row.metadata as Record<string, string | number | boolean>)
            : undefined,
      }));
      setQuizAttempts(attempts);
    }

    void loadQuizAttempts();
  }, [activeModuleId, supabase, user?.id]);

  useEffect(() => {
    if (!user?.id || !courseId || !activeModuleId) return;

    const moduleEntry = modules.find((entry) => entry.id === activeModuleId);
    if (!moduleEntry) return;

    const now = new Date().toISOString();
    if (isDevBypass) {
      recordMockModuleEvent({
        id: `module-event-${Date.now()}`,
        userId: user.id,
        courseId,
        moduleId: activeModuleId,
        eventType: "module_viewed",
        watchTimeSeconds: 0,
        createdAt: now,
        metadata: { source: "dev" },
      });
      return;
    }

    void supabase.from("course_module_events").insert({
      user_id: user.id,
      course_id: moduleEntry.courseId,
      module_id: activeModuleId,
      event_type: "module_viewed",
      watch_time_seconds: 0,
      metadata: {
        source: "module_change",
      },
    });
  }, [activeModuleId, courseId, modules, supabase, user?.id]);

  useEffect(() => {
    if (!user || !course || !isCourseComplete) return;
    const currentCourseId = course.id;
    if (isDevBypass) {
      const now = new Date().toISOString();
      setCertificateIssuedAt(now);
      setCertificateUrl(null);
      setCertificateVerificationUrl(`/certificates/dev-${course.id}`);
      setCertificateNumber(`DEV-${course.id.toUpperCase()}`);
      return;
    }

    async function issueCertificate() {
      setCertificateError(null);
      const response = await fetch("/api/certificates/issue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ courseId: currentCourseId }),
      });
      const json = (await response.json()) as {
        issuedAt?: string;
        certificateUrl?: string | null;
        verificationUrl?: string | null;
        certificateNumber?: string | null;
        error?: string;
      };

      if (!response.ok) {
        setCertificateError(json.error || "Unable to issue certificate right now.");
        return;
      }

      setCertificateIssuedAt(json.issuedAt ?? new Date().toISOString());
      setCertificateUrl(json.certificateUrl ?? null);
      setCertificateVerificationUrl(json.verificationUrl ?? null);
      setCertificateNumber(json.certificateNumber ?? null);
    }

    void issueCertificate();
  }, [course, isCourseComplete, user]);

  useEffect(() => {
    async function loadCohorts() {
      if (!courseId || !user?.id) {
        setCourseCohorts([]);
        setSelectedCohortId(null);
        return;
      }

      setCohortError(null);
      setCohortLoading(true);

      if (isDevBypass) {
        const cohortRows = getMockCohortsForCourse(courseId);
        const memberRows = getMockCohortMembers();
        const mapped = cohortRows.map((cohort) => {
          const members = memberRows.filter((member) => member.cohortId === cohort.id);
          const membership = members.find((member) => member.userId === user.id);
          return {
            ...cohort,
            membersCount: members.length,
            isMember: Boolean(membership),
            membershipRole: membership?.membershipRole,
          };
        });
        setCourseCohorts(mapped);
        setSelectedCohortId((current) => {
          if (current && mapped.some((cohort) => cohort.id === current)) return current;
          const joined = mapped.find((cohort) => cohort.isMember);
          return joined?.id ?? mapped[0]?.id ?? null;
        });
        setCohortLoading(false);
        return;
      }

      const response = await fetch(`/api/lms/cohorts?courseId=${encodeURIComponent(courseId)}`);
      const json = (await response.json()) as {
        cohorts?: CourseCohort[];
        error?: string;
      };
      if (!response.ok) {
        setCohortError(json.error || "Unable to load cohorts right now.");
        setCourseCohorts([]);
        setSelectedCohortId(null);
        setCohortLoading(false);
        return;
      }

      const loaded = json.cohorts ?? [];
      setCourseCohorts(loaded);
      setSelectedCohortId((current) => {
        if (current && loaded.some((cohort) => cohort.id === current)) return current;
        const joined = loaded.find((cohort) => cohort.isMember);
        return joined?.id ?? loaded[0]?.id ?? null;
      });
      setCohortLoading(false);
    }

    void loadCohorts();
  }, [courseId, user?.id]);

  useEffect(() => {
    async function loadThreads() {
      if (!courseId || !user?.id) {
        setDiscussionThreads([]);
        setThreadError(null);
        return;
      }

      setDiscussionLoading(true);
      setThreadError(null);

      if (isDevBypass) {
        setDiscussionThreads(getMockDiscussionThreadsForCourse(courseId, selectedCohortId));
        setDiscussionLoading(false);
        return;
      }

      const params = new URLSearchParams();
      params.set("courseId", courseId);
      if (selectedCohortId) {
        params.set("cohortId", selectedCohortId);
      }
      const response = await fetch(`/api/lms/discussions/threads?${params.toString()}`);
      const json = (await response.json()) as {
        threads?: CourseDiscussionThread[];
        error?: string;
      };
      if (!response.ok) {
        setThreadError(json.error || "Unable to load community threads.");
        setDiscussionThreads([]);
        setDiscussionLoading(false);
        return;
      }

      setDiscussionThreads(json.threads ?? []);
      setDiscussionLoading(false);
    }

    void loadThreads();
  }, [courseId, selectedCohortId, user?.id]);

  useEffect(() => {
    if (!activeThreadId) return;
    const stillVisible = discussionThreads.some((thread) => thread.id === activeThreadId);
    if (!stillVisible) {
      setActiveThreadId(null);
    }
  }, [activeThreadId, discussionThreads]);

  async function createCohort() {
    if (!courseId || !user?.id || !canManageLms) return;
    const name = newCohortName.trim();
    if (!name) return;

    setCohortError(null);

    if (isDevBypass) {
      const cohortId = nextLocalId("cohort");
      addMockCohort({
        id: cohortId,
        courseId,
        name,
        description: newCohortDescription.trim() || undefined,
        isActive: true,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        membersCount: 1,
        isMember: true,
        membershipRole: "instructor",
      });
      joinMockCohort(cohortId, user.id, "instructor");
      setNewCohortName("");
      setNewCohortDescription("");
      const mapped = getMockCohortsForCourse(courseId).map((cohort) => {
        const members = getMockCohortMembers().filter((member) => member.cohortId === cohort.id);
        const membership = members.find((member) => member.userId === user.id);
        return {
          ...cohort,
          membersCount: members.length,
          isMember: Boolean(membership),
          membershipRole: membership?.membershipRole,
        };
      });
      setCourseCohorts(mapped);
      setSelectedCohortId(cohortId);
      return;
    }

    const response = await fetch("/api/lms/cohorts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "create",
        courseId,
        name,
        description: newCohortDescription.trim() || undefined,
      }),
    });
    const json = (await response.json()) as {
      cohort?: CourseCohort;
      error?: string;
    };
    if (!response.ok) {
      setCohortError(json.error || "Unable to create cohort.");
      return;
    }

    setNewCohortName("");
    setNewCohortDescription("");
    if (json.cohort?.id) {
      setSelectedCohortId(json.cohort.id);
    }
    const refresh = await fetch(`/api/lms/cohorts?courseId=${encodeURIComponent(courseId)}`);
    const refreshJson = (await refresh.json()) as { cohorts?: CourseCohort[] };
    if (refresh.ok) {
      setCourseCohorts(refreshJson.cohorts ?? []);
    }
  }

  async function toggleCohortMembership(cohort: CourseCohort) {
    if (!user?.id) return;
    setCohortError(null);

    if (isDevBypass) {
      if (cohort.isMember) {
        leaveMockCohort(cohort.id, user.id);
      } else {
        joinMockCohort(cohort.id, user.id);
      }
      const mapped = getMockCohortsForCourse(courseId).map((entry) => {
        const members = getMockCohortMembers().filter((member) => member.cohortId === entry.id);
        const membership = members.find((member) => member.userId === user.id);
        return {
          ...entry,
          membersCount: members.length,
          isMember: Boolean(membership),
          membershipRole: membership?.membershipRole,
        };
      });
      setCourseCohorts(mapped);
      let nextSelected = selectedCohortId;
      if (!cohort.isMember) {
        nextSelected = cohort.id;
        setSelectedCohortId(cohort.id);
      } else if (selectedCohortId === cohort.id) {
        const fallback = mapped.find((entry) => entry.isMember) ?? mapped[0];
        nextSelected = fallback?.id ?? null;
        setSelectedCohortId(nextSelected);
      }
      setDiscussionThreads(getMockDiscussionThreadsForCourse(courseId, nextSelected));
      return;
    }

    const response = await fetch("/api/lms/cohorts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: cohort.isMember ? "leave" : "join",
        cohortId: cohort.id,
      }),
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setCohortError(json.error || "Unable to update cohort membership.");
      return;
    }

    const refresh = await fetch(`/api/lms/cohorts?courseId=${encodeURIComponent(courseId ?? "")}`);
    const refreshJson = (await refresh.json()) as { cohorts?: CourseCohort[] };
    if (refresh.ok) {
      const refreshed = refreshJson.cohorts ?? [];
      setCourseCohorts(refreshed);
      if (!cohort.isMember) {
        setSelectedCohortId(cohort.id);
      } else if (selectedCohortId === cohort.id) {
        const fallback = refreshed.find((entry) => entry.isMember) ?? refreshed[0];
        setSelectedCohortId(fallback?.id ?? null);
      }
    }
  }

  async function createDiscussionThread() {
    if (!courseId || !user?.id) return;
    const title = threadTitle.trim();
    const body = threadBody.trim();
    if (!title || !body) return;

    setThreadError(null);

    if (isDevBypass) {
      const thread: CourseDiscussionThread = {
        id: nextLocalId("thread"),
        courseId,
        cohortId: selectedCohortId ?? undefined,
        moduleId: activeModule?.id ?? undefined,
        authorUserId: user.id,
        authorName: `${user.firstName} ${user.lastName}`.trim(),
        title,
        body,
        pinned: false,
        locked: false,
        replyCount: 0,
        lastActivityAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addMockDiscussionThread(thread);
      setDiscussionThreads(getMockDiscussionThreadsForCourse(courseId, selectedCohortId));
      setThreadTitle("");
      setThreadBody("");
      return;
    }

    const response = await fetch("/api/lms/discussions/threads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        courseId,
        cohortId: selectedCohortId,
        moduleId: activeModule?.id,
        title,
        body,
      }),
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setThreadError(json.error || "Unable to publish thread.");
      return;
    }

    setThreadTitle("");
    setThreadBody("");

    const params = new URLSearchParams();
    params.set("courseId", courseId);
    if (selectedCohortId) params.set("cohortId", selectedCohortId);
    const refresh = await fetch(`/api/lms/discussions/threads?${params.toString()}`);
    const refreshJson = (await refresh.json()) as { threads?: CourseDiscussionThread[] };
    if (refresh.ok) {
      setDiscussionThreads(refreshJson.threads ?? []);
    }
  }

  async function toggleThreadModeration(threadId: string, updates: { pinned?: boolean; locked?: boolean }) {
    if (!canManageLms) return;

    if (isDevBypass) {
      updateMockDiscussionThread(threadId, updates);
      setDiscussionThreads((current) =>
        current.map((thread) => (thread.id === threadId ? { ...thread, ...updates } : thread))
      );
      return;
    }

    const response = await fetch(`/api/lms/discussions/threads/${threadId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setThreadError(json.error || "Unable to update thread settings.");
      return;
    }

    setDiscussionThreads((current) =>
      current.map((thread) => (thread.id === threadId ? { ...thread, ...updates } : thread))
    );
  }

  async function loadThreadReplies(threadId: string) {
    if (!user?.id) return;
    setReplyError(null);

    if (isDevBypass) {
      setRepliesByThreadId((current) => ({
        ...current,
        [threadId]: getMockDiscussionRepliesForThread(threadId),
      }));
      return;
    }

    const response = await fetch(`/api/lms/discussions/threads/${threadId}/replies`);
    const json = (await response.json()) as { replies?: CourseDiscussionReply[]; error?: string };
    if (!response.ok) {
      setReplyError(json.error || "Unable to load replies.");
      return;
    }
    setRepliesByThreadId((current) => ({
      ...current,
      [threadId]: json.replies ?? [],
    }));
  }

  async function addDiscussionReply(thread: CourseDiscussionThread) {
    if (!user?.id) return;
    const content = (replyDraftByThreadId[thread.id] ?? "").trim();
    if (!content) return;
    setReplyError(null);

    if (isDevBypass) {
      const reply: CourseDiscussionReply = {
        id: nextLocalId("reply"),
        threadId: thread.id,
        authorUserId: user.id,
        authorName: `${user.firstName} ${user.lastName}`.trim(),
        body: content,
        isInstructorReply: canManageLms,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addMockDiscussionReply(reply);
      setRepliesByThreadId((current) => ({
        ...current,
        [thread.id]: getMockDiscussionRepliesForThread(thread.id),
      }));
      setDiscussionThreads(getMockDiscussionThreadsForCourse(courseId, selectedCohortId));
      setReplyDraftByThreadId((current) => ({ ...current, [thread.id]: "" }));
      return;
    }

    const response = await fetch(`/api/lms/discussions/threads/${thread.id}/replies`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body: content }),
    });
    const json = (await response.json()) as {
      reply?: CourseDiscussionReply;
      error?: string;
    };
    if (!response.ok || !json.reply) {
      setReplyError(json.error || "Unable to post reply.");
      return;
    }

    setRepliesByThreadId((current) => ({
      ...current,
      [thread.id]: [...(current[thread.id] ?? []), json.reply!],
    }));
    setReplyDraftByThreadId((current) => ({ ...current, [thread.id]: "" }));
    setDiscussionThreads((current) =>
      current.map((entry) =>
        entry.id === thread.id
          ? {
              ...entry,
              replyCount: entry.replyCount + 1,
              lastActivityAt: json.reply!.createdAt,
            }
          : entry
      )
    );
  }

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
  const activeQuizSession =
    activeQuizPayload && activeModule
      ? createQuizSession(
          activeQuizPayload,
          quizSessionSeed || `${activeModule.id}:${user?.id ?? "anonymous"}`
        )
      : null;
  const activeModuleIndex = activeModule
    ? courseModules.findIndex((module) => module.id === activeModule.id)
    : -1;
  const nextModule =
    activeModuleIndex >= 0 && activeModuleIndex < courseModules.length - 1
      ? courseModules[activeModuleIndex + 1]
      : undefined;
  const cannotPostToSelectedCohort = Boolean(
    selectedCohort && !selectedCohort.isMember && !canManageLms
  );

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
    if (!user || !course || !activeModule || !activeQuizSession) return;
    if (!activeModuleUnlocked) return;
    const currentUser = user;
    const currentCourse = course;
    const currentModule = activeModule;
    const currentQuizSession = activeQuizSession;

    const unanswered = currentQuizSession.questions.filter(
      (question) => quizAnswers[question.id] === undefined
    );
    if (unanswered.length > 0) {
      setQuizError("Please answer every question before submitting.");
      return;
    }

    const result = gradeQuizSession(
      currentQuizSession,
      quizAnswers,
      currentModule.passThreshold ?? 70
    );
    setQuizResult(result);
    setQuizError(null);
    setQuizAttemptError(null);

    const now = new Date().toISOString();
    const durationSeconds = quizAttemptStartedAt
      ? Math.max(1, Math.floor((new Date(now).getTime() - new Date(quizAttemptStartedAt).getTime()) / 1000))
      : 0;
    const nextAttemptNumber = (quizAttempts[0]?.attemptNumber ?? 0) + 1;
    const nextAttempt: UserQuizAttempt = {
      id: `attempt-${now.replace(/[^0-9]/g, "")}`,
      userId: currentUser.id,
      courseId: currentCourse.id,
      moduleId: currentModule.id,
      attemptNumber: nextAttemptNumber,
      scorePercent: result.scorePercent,
      correctAnswers: result.correctAnswers,
      totalQuestions: result.totalQuestions,
      passed: result.passed,
      answers: quizAnswers,
      questionOrder: currentQuizSession.questionOrder,
      optionOrder: currentQuizSession.optionOrderByQuestion,
      startedAt: quizAttemptStartedAt ?? now,
      submittedAt: now,
      durationSeconds,
      metadata: {
        seed: currentQuizSession.seed,
      },
    };

    async function persistAttempt() {
      if (isDevBypass) {
        addMockQuizAttempt(nextAttempt);
        recordMockModuleEvent({
          id: `module-event-${Date.now()}`,
          userId: currentUser.id,
          courseId: currentCourse.id,
          moduleId: currentModule.id,
          eventType: result.passed ? "quiz_passed" : "quiz_failed",
          watchTimeSeconds: currentModule.durationSeconds,
          createdAt: now,
          metadata: { score: result.scorePercent },
        });
        setQuizAttempts((current) => [nextAttempt, ...current]);
      } else {
        const { data, error } = await supabase
          .from("user_quiz_attempts")
          .insert({
            user_id: currentUser.id,
            course_id: currentCourse.id,
            module_id: currentModule.id,
            attempt_number: nextAttemptNumber,
            score_percent: result.scorePercent,
            correct_answers: result.correctAnswers,
            total_questions: result.totalQuestions,
            passed: result.passed,
            answers: quizAnswers,
            question_order: currentQuizSession.questionOrder,
            option_order: currentQuizSession.optionOrderByQuestion,
            started_at: quizAttemptStartedAt ?? now,
            submitted_at: now,
            duration_seconds: durationSeconds,
            metadata: {
              seed: currentQuizSession.seed,
            },
            })
          .select("*")
          .single();

        if (error) {
          setQuizAttemptError("Attempt saved locally in this session, but history failed to persist.");
        } else {
          setQuizAttempts((current) => [
            {
              id: data.id,
              userId: data.user_id,
              courseId: data.course_id,
              moduleId: data.module_id,
              attemptNumber: data.attempt_number,
              scorePercent: data.score_percent,
              correctAnswers: data.correct_answers,
              totalQuestions: data.total_questions,
              passed: data.passed,
              answers: (data.answers as Record<string, string | number>) ?? {},
              questionOrder: data.question_order ?? [],
              optionOrder: (data.option_order as Record<string, number[]>) ?? {},
              startedAt: data.started_at,
              submittedAt: data.submitted_at,
              durationSeconds: data.duration_seconds,
              metadata:
                data.metadata && typeof data.metadata === "object"
                  ? (data.metadata as Record<string, string | number | boolean>)
                  : undefined,
            },
            ...current,
          ]);
        }

        await supabase.from("course_module_events").insert({
          user_id: currentUser.id,
          course_id: currentCourse.id,
          module_id: currentModule.id,
          event_type: result.passed ? "quiz_passed" : "quiz_failed",
          watch_time_seconds: currentModule.durationSeconds,
          metadata: {
            score: result.scorePercent,
            attemptNumber: nextAttemptNumber,
          },
        });
      }

      if (result.passed) {
        await updateProgress(currentModule.id, {
          completed: true,
          watchTimeSeconds: currentModule.durationSeconds,
        });
      }
    }

    void persistAttempt();
  }

  function retakeQuiz() {
    setQuizAnswers({});
    setQuizResult(null);
    setQuizError(null);
    setQuizAttemptError(null);
    setQuizSessionSeed(`${activeModuleId ?? "module"}:${user?.id ?? "anonymous"}:${Date.now()}`);
    setQuizAttemptStartedAt(new Date().toISOString());
  }

  function downloadCertificate() {
    if (!isCourseComplete || !course) return;
    if (certificateUrl) {
      window.open(certificateUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (!isDevBypass) {
      setCertificateError("Certificate is still generating. Try again in a few seconds.");
      return;
    }
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
              {certificateNumber && (
                <p className="mt-1 text-[11px] text-[#2b4d24]">Certificate #{certificateNumber}</p>
              )}
              {certificateVerificationUrl && (
                <p className="text-[11px] text-[#666666]">
                  Verification:{" "}
                  <a
                    href={certificateVerificationUrl}
                    className="text-[#2b4d24] underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {certificateVerificationUrl}
                  </a>
                </p>
              )}
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
              {activeModuleType === "quiz" && activeQuizSession && (
                <div className="space-y-4 rounded-xl border border-[#c5ccc2]/50 bg-white/70 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[#8b957b]">
                      Knowledge Check
                    </p>
                    <p className="text-sm text-[#666666]">
                      Pass score: {activeModule?.passThreshold ?? 70}%
                    </p>
                  </div>
                  {activeQuizSession.questions.map((question, idx) => (
                    <div key={question.id} className="space-y-2 rounded-lg border border-[#c5ccc2]/40 bg-white p-3">
                      <p className="text-sm font-medium text-[#1a1a1a]">
                        {idx + 1}. {question.prompt || "Untitled question"}
                      </p>
                      <div className="space-y-2">
                        {question.options.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() =>
                              setQuizAnswers((current) => ({
                                ...current,
                                [question.id]: option.id,
                              }))
                            }
                            className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                              quizAnswers[question.id] === option.id
                                ? "border-[#2b4d24] bg-[#2b4d24]/10 text-[#1a1a1a]"
                                : "border-[#d8d8d8] bg-white text-[#666666]"
                            }`}
                          >
                            {option.label || "Option"}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="outline" onClick={submitQuizAttempt} disabled={!activeModuleUnlocked}>
                      Submit Quiz
                    </Button>
                    <Button variant="ghost" onClick={retakeQuiz} disabled={!activeModuleUnlocked}>
                      Retake
                    </Button>
                    {quizResult && (
                      <span className={quizResult.passed ? "text-sm text-[#2b4d24]" : "text-sm text-[#a36d4c]"}>
                        Score: {quizResult.scorePercent}% ({quizResult.correctAnswers}/{quizResult.totalQuestions}){" "}
                        {quizResult.passed ? "- Passed" : "- Try again"}
                      </span>
                    )}
                  </div>
                  {quizError && <p className="text-xs text-[#a36d4c]">{quizError}</p>}
                  {quizAttemptError && <p className="text-xs text-[#a36d4c]">{quizAttemptError}</p>}
                  {quizAttempts.length > 0 && (
                    <div className="rounded-lg border border-[#c5ccc2]/40 bg-white p-3">
                      <p className="text-xs uppercase tracking-wide text-[#8b957b]">Attempt History</p>
                      <div className="mt-2 space-y-1">
                        {quizAttempts.slice(0, 5).map((attempt) => (
                          <p key={attempt.id} className="text-xs text-[#666666]">
                            Attempt {attempt.attemptNumber}: {attempt.scorePercent}%{" "}
                            {attempt.passed ? "(Passed)" : "(Not passed)"} on{" "}
                            {new Date(attempt.submittedAt).toLocaleString()}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
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

          {courseId && (
            <CourseAssignmentsPanel
              courseId={courseId}
              userId={user?.id}
              canManageLms={canManageLms}
            />
          )}

          <Card className="glass-subtle border-0">
            <CardContent className="p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-serif text-lg text-[#1a1a1a]">Cohort Community</h3>
                  <p className="text-sm text-[#666666]">
                    Discuss lessons with your cohort, ask questions, and share application ideas.
                  </p>
                </div>
                {cohortLoading && <span className="text-xs text-[#999999]">Loading cohorts...</span>}
              </div>

              <div className="space-y-2">
                {courseCohorts.length === 0 ? (
                  <p className="text-xs text-[#999999]">
                    No cohorts are available yet for this course.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {courseCohorts.map((cohort) => {
                      const isSelected = selectedCohortId === cohort.id;
                      return (
                        <div
                          key={cohort.id}
                          className={`rounded-xl border p-3 ${
                            isSelected ? "border-[#2b4d24]/40 bg-[#2b4d24]/5" : "border-[#c5ccc2]/40 bg-white/70"
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <button
                              type="button"
                              className="text-left"
                              onClick={() => setSelectedCohortId(cohort.id)}
                            >
                              <p className="text-sm font-medium text-[#1a1a1a]">{cohort.name}</p>
                              <p className="text-xs text-[#999999]">
                                {cohort.membersCount ?? 0} members
                                {cohort.startsAt ? ` • Starts ${formatDateTime(cohort.startsAt)}` : ""}
                              </p>
                              {cohort.description && (
                                <p className="mt-1 text-xs text-[#666666]">{cohort.description}</p>
                              )}
                            </button>
                            <Button
                              size="sm"
                              variant={cohort.isMember ? "outline" : "default"}
                              className={cohort.isMember ? "" : "bg-[#2b4d24] hover:bg-[#1a3a15]"}
                              onClick={() => void toggleCohortMembership(cohort)}
                            >
                              {cohort.isMember ? "Leave" : "Join"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {canManageLms && (
                <div className="space-y-2 rounded-xl border border-[#2b4d24]/20 bg-[#2b4d24]/5 p-3">
                  <p className="text-xs uppercase tracking-wide text-[#2b4d24]">Create Cohort</p>
                  <Input
                    value={newCohortName}
                    onChange={(event) => setNewCohortName(event.target.value)}
                    placeholder="Cohort name"
                    className="bg-white/80"
                  />
                  <Textarea
                    value={newCohortDescription}
                    onChange={(event) => setNewCohortDescription(event.target.value)}
                    placeholder="Cohort description (optional)"
                    rows={2}
                    className="bg-white/80"
                  />
                  <Button
                    size="sm"
                    className="bg-[#2b4d24] hover:bg-[#1a3a15]"
                    onClick={() => void createCohort()}
                    disabled={!newCohortName.trim()}
                  >
                    Create Cohort
                  </Button>
                </div>
              )}

              <div className="space-y-2 rounded-xl border border-[#c5ccc2]/40 bg-white/70 p-3">
                <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#8b957b]">
                  <MessageSquare className="h-3.5 w-3.5" /> Start A Thread
                </p>
                <Input
                  value={threadTitle}
                  onChange={(event) => setThreadTitle(event.target.value)}
                  placeholder="Thread title"
                  className="bg-white/80"
                />
                <Textarea
                  value={threadBody}
                  onChange={(event) => setThreadBody(event.target.value)}
                  placeholder="What do you want to discuss?"
                  rows={3}
                  className="bg-white/80"
                />
                {selectedCohort && (
                  <p className="text-xs text-[#999999]">
                    Posting to cohort: <span className="font-medium text-[#666666]">{selectedCohort.name}</span>
                  </p>
                )}
                {cannotPostToSelectedCohort && (
                  <p className="text-xs text-[#a36d4c]">Join the selected cohort to post in this space.</p>
                )}
                <Button
                  size="sm"
                  className="bg-[#2b4d24] hover:bg-[#1a3a15]"
                  onClick={() => void createDiscussionThread()}
                  disabled={!threadTitle.trim() || !threadBody.trim() || cannotPostToSelectedCohort}
                >
                  Post Thread
                </Button>
              </div>

              {cohortError && <p className="text-xs text-[#a36d4c]">{cohortError}</p>}
              {threadError && <p className="text-xs text-[#a36d4c]">{threadError}</p>}
              {replyError && <p className="text-xs text-[#a36d4c]">{replyError}</p>}

              <div className="space-y-3">
                {discussionLoading ? (
                  <p className="text-xs text-[#999999]">Loading discussions...</p>
                ) : discussionThreads.length === 0 ? (
                  <p className="text-xs text-[#999999]">
                    No discussion threads yet. Start the first one for your cohort.
                  </p>
                ) : (
                  discussionThreads.map((thread) => (
                    <div
                      key={thread.id}
                      className="rounded-xl border border-[#c5ccc2]/40 bg-white/80 p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            {thread.pinned && <Pin className="h-3.5 w-3.5 text-[#2b4d24]" />}
                            <p className="text-sm font-medium text-[#1a1a1a]">{thread.title}</p>
                            {thread.locked && (
                              <Badge variant="outline" className="text-[10px] uppercase tracking-wide text-[#a36d4c]">
                                Locked
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-[#999999]">
                            {thread.authorName ?? "Favor Partner"} • {formatDateTime(thread.createdAt)}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {thread.replyCount} replies
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const nextActive = activeThreadId === thread.id ? null : thread.id;
                              setActiveThreadId(nextActive);
                              if (nextActive && !repliesByThreadId[thread.id]) {
                                void loadThreadReplies(thread.id);
                              }
                            }}
                          >
                            {activeThreadId === thread.id ? "Hide Replies" : "View Replies"}
                          </Button>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-[#666666] whitespace-pre-wrap">{thread.body}</p>

                      {canManageLms && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              void toggleThreadModeration(thread.id, { pinned: !thread.pinned })
                            }
                          >
                            {thread.pinned ? "Unpin" : "Pin"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              void toggleThreadModeration(thread.id, { locked: !thread.locked })
                            }
                          >
                            {thread.locked ? "Unlock" : "Lock"}
                          </Button>
                        </div>
                      )}

                      {activeThreadId === thread.id && (
                        <div className="mt-3 space-y-3 rounded-lg border border-[#c5ccc2]/35 bg-white/70 p-3">
                          <div className="space-y-2">
                            {(repliesByThreadId[thread.id] ?? []).length === 0 ? (
                              <p className="text-xs text-[#999999]">No replies yet.</p>
                            ) : (
                              (repliesByThreadId[thread.id] ?? []).map((reply) => (
                                <div key={reply.id} className="rounded-md border border-[#e9e9e9] bg-white p-2">
                                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#999999]">
                                    <span>{reply.authorName ?? "Favor Partner"}</span>
                                    {reply.isInstructorReply && (
                                      <Badge variant="outline" className="text-[10px] text-[#2b4d24]">
                                        Instructor
                                      </Badge>
                                    )}
                                    <span>{formatDateTime(reply.createdAt)}</span>
                                  </div>
                                  <p className="mt-1 text-xs text-[#666666] whitespace-pre-wrap">
                                    {reply.body}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                          <Textarea
                            value={replyDraftByThreadId[thread.id] ?? ""}
                            onChange={(event) =>
                              setReplyDraftByThreadId((current) => ({
                                ...current,
                                [thread.id]: event.target.value,
                              }))
                            }
                            placeholder={
                              thread.locked && !canManageLms
                                ? "Thread is locked by an instructor."
                                : "Write a reply..."
                            }
                            rows={3}
                            className="bg-white/85"
                            disabled={thread.locked && !canManageLms}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void addDiscussionReply(thread)}
                            disabled={
                              !replyDraftByThreadId[thread.id]?.trim() ||
                              (thread.locked && !canManageLms)
                            }
                          >
                            Reply
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
