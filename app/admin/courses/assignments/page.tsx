"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCourses } from "@/hooks/use-courses";
import { isDevBypass } from "@/lib/dev-mode";
import {
  addMockAssignment,
  getMockAssignmentSubmissions,
  getMockAssignmentsForCourse,
  getMockUsers,
  upsertMockAssignmentSubmission,
} from "@/lib/mock-store";
import type {
  CourseAssignment,
  CourseAssignmentSubmission,
  CourseAssignmentSubmissionStatus,
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";

type SubmissionWithIdentity = CourseAssignmentSubmission & {
  userName?: string;
  userEmail?: string;
};

interface AssignmentDraft {
  title: string;
  description: string;
  instructions: string;
  dueAt: string;
  pointsPossible: number;
  passingPercent: number;
  isPublished: boolean;
  moduleId: string;
}

const DEFAULT_DRAFT: AssignmentDraft = {
  title: "",
  description: "",
  instructions: "",
  dueAt: "",
  pointsPossible: 100,
  passingPercent: 70,
  isPublished: true,
  moduleId: "none",
};

function fromDateTimeLocal(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function normalizeSubmissionStatus(
  value: string | undefined
): CourseAssignmentSubmissionStatus {
  if (value === "draft" || value === "submitted" || value === "returned" || value === "graded") {
    return value;
  }
  return "submitted";
}

export default function AdminCourseAssignmentsPage() {
  const { user } = useAuth();
  const { courses, modules } = useCourses(user?.id);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [assignments, setAssignments] = useState<CourseAssignment[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionWithIdentity[]>([]);
  const [draft, setDraft] = useState<AssignmentDraft>(DEFAULT_DRAFT);
  const [gradeBySubmissionId, setGradeBySubmissionId] = useState<
    Record<string, { scorePercent: string; feedback: string; status: "returned" | "graded" }>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  );
  const selectedCourseModules = useMemo(
    () => modules.filter((module) => module.courseId === selectedCourseId).sort((a, b) => a.sortOrder - b.sortOrder),
    [modules, selectedCourseId]
  );

  useEffect(() => {
    if (!selectedCourseId && courses.length > 0) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  useEffect(() => {
    async function loadAssignments() {
      if (!selectedCourseId) return;
      setIsLoading(true);
      setError(null);
      setMessage(null);

      if (isDevBypass) {
        const assignmentRows = getMockAssignmentsForCourse(selectedCourseId, true);
        const assignmentIds = new Set(assignmentRows.map((row) => row.id));
        const userMap = new Map(
          getMockUsers().map((entry) => [entry.id, { name: `${entry.firstName} ${entry.lastName}`, email: entry.email }])
        );
        const submissionRows = getMockAssignmentSubmissions()
          .filter((submission) => assignmentIds.has(submission.assignmentId))
          .map((submission) => ({
            ...submission,
            status: normalizeSubmissionStatus(submission.status),
            userName: userMap.get(submission.userId)?.name ?? "Favor Partner",
            userEmail: userMap.get(submission.userId)?.email ?? "",
          }));
        setAssignments(assignmentRows);
        setSubmissions(submissionRows);
        setIsLoading(false);
        return;
      }

      const response = await fetch(`/api/lms/assignments?courseId=${encodeURIComponent(selectedCourseId)}`);
      const json = (await response.json()) as {
        assignments?: CourseAssignment[];
        submissions?: Array<SubmissionWithIdentity & { status?: string }>;
        error?: string;
      };
      if (!response.ok) {
        setError(json.error ?? "Unable to load assignments");
        setAssignments([]);
        setSubmissions([]);
        setIsLoading(false);
        return;
      }

      setAssignments(json.assignments ?? []);
      setSubmissions(
        (json.submissions ?? []).map((entry) => ({
          ...entry,
          status: normalizeSubmissionStatus(entry.status),
        }))
      );
      setIsLoading(false);
    }

    void loadAssignments();
  }, [selectedCourseId]);

  const submissionsByAssignment = useMemo(() => {
    return submissions.reduce<Record<string, SubmissionWithIdentity[]>>((acc, submission) => {
      acc[submission.assignmentId] = acc[submission.assignmentId] || [];
      acc[submission.assignmentId].push(submission);
      return acc;
    }, {});
  }, [submissions]);

  async function handleCreateAssignment() {
    if (!user?.id || !selectedCourseId || !draft.title.trim()) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);

    const payload = {
      courseId: selectedCourseId,
      moduleId: draft.moduleId === "none" ? null : draft.moduleId,
      title: draft.title.trim(),
      description: draft.description.trim(),
      instructions: draft.instructions.trim(),
      dueAt: fromDateTimeLocal(draft.dueAt) ?? null,
      pointsPossible: draft.pointsPossible,
      passingPercent: draft.passingPercent,
      isPublished: draft.isPublished,
    };

    if (isDevBypass) {
      const now = new Date().toISOString();
      addMockAssignment({
        id: `assignment-${Date.now()}`,
        courseId: payload.courseId,
        moduleId: payload.moduleId ?? undefined,
        title: payload.title,
        description: payload.description,
        instructions: payload.instructions || undefined,
        dueAt: payload.dueAt ?? undefined,
        pointsPossible: payload.pointsPossible,
        passingPercent: payload.passingPercent,
        isPublished: payload.isPublished,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      });
      setDraft(DEFAULT_DRAFT);
      setMessage("Assignment created.");
      const refreshed = getMockAssignmentsForCourse(selectedCourseId, true);
      setAssignments(refreshed);
      setIsSaving(false);
      return;
    }

    const response = await fetch("/api/lms/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await response.json()) as { assignment?: CourseAssignment; error?: string };
    if (!response.ok) {
      setError(json.error ?? "Unable to create assignment");
      setIsSaving(false);
      return;
    }
    setAssignments((current) => [json.assignment as CourseAssignment, ...current]);
    setDraft(DEFAULT_DRAFT);
    setMessage("Assignment created.");
    setIsSaving(false);
  }

  async function handleGradeSubmission(submission: SubmissionWithIdentity) {
    const grade = gradeBySubmissionId[submission.id];
    if (!grade) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);

    const scoreValue = Number(grade.scorePercent);
    const scorePercent = Number.isFinite(scoreValue) ? Math.max(0, Math.min(100, scoreValue)) : null;

    if (isDevBypass) {
      const now = new Date().toISOString();
      upsertMockAssignmentSubmission({
        ...submission,
        status: grade.status,
        scorePercent: scorePercent ?? undefined,
        feedback: grade.feedback.trim() || undefined,
        gradedAt: grade.status === "graded" ? now : undefined,
        graderUserId: user?.id,
        updatedAt: now,
      });
      setSubmissions((current) =>
        current.map((entry) =>
          entry.id === submission.id
            ? {
                ...entry,
                status: grade.status,
                scorePercent: scorePercent ?? undefined,
                feedback: grade.feedback.trim() || undefined,
                gradedAt: grade.status === "graded" ? now : undefined,
                graderUserId: user?.id,
                updatedAt: now,
              }
            : entry
        )
      );
      setMessage("Submission updated.");
      setIsSaving(false);
      return;
    }

    const response = await fetch(`/api/lms/assignments/submissions/${submission.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scorePercent,
        feedback: grade.feedback,
        status: grade.status,
      }),
    });
    const json = (await response.json()) as {
      submission?: CourseAssignmentSubmission;
      error?: string;
    };
    if (!response.ok || !json.submission) {
      setError(json.error ?? "Unable to grade submission");
      setIsSaving(false);
      return;
    }
    const updatedSubmission = json.submission;

    setSubmissions((current) =>
      current.map((entry) =>
        entry.id === submission.id
          ? {
              ...entry,
              ...updatedSubmission,
              status: normalizeSubmissionStatus(updatedSubmission.status),
            }
          : entry
      )
    );
    setMessage("Submission updated.");
    setIsSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-[#1a1a1a]">Assignments and Grading</h1>
          <p className="text-sm text-[#666666]">
            Publish coursework, monitor submissions, and grade learner outcomes.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/courses">Back to LMS Admin</Link>
        </Button>
      </div>

      <Card className="glass-subtle border-0">
        <CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-3">
            <Label>Course</Label>
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-[#999999]">
              {selectedCourse
                ? `Managing assignments for ${selectedCourse.title}`
                : "Select a course to begin."}
            </p>
          </div>
          <div className="space-y-3 rounded-xl border border-[#c5ccc2]/40 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-wide text-[#8b957b]">Create Assignment</p>
            <Input
              placeholder="Assignment title"
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            />
            <Textarea
              placeholder="Assignment description"
              rows={2}
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
            />
            <Textarea
              placeholder="Instructions (optional)"
              rows={2}
              value={draft.instructions}
              onChange={(event) => setDraft((current) => ({ ...current, instructions: event.target.value }))}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-[#8b957b]">Due Date</Label>
                <Input
                  type="datetime-local"
                  value={draft.dueAt}
                  onChange={(event) => setDraft((current) => ({ ...current, dueAt: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#8b957b]">Linked Module</Label>
                <Select
                  value={draft.moduleId}
                  onValueChange={(value) => setDraft((current) => ({ ...current, moduleId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No module link</SelectItem>
                    {selectedCourseModules.map((module) => (
                      <SelectItem key={module.id} value={module.id}>
                        {module.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-[#8b957b]">Points</Label>
                <Input
                  type="number"
                  min={0}
                  value={draft.pointsPossible}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      pointsPossible: Number(event.target.value || 0),
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#8b957b]">Passing %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={draft.passingPercent}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      passingPercent: Number(event.target.value || 0),
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#d6d6cf] p-2">
              <span className="text-xs text-[#666666]">Published</span>
              <Switch
                checked={draft.isPublished}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({ ...current, isPublished: checked }))
                }
              />
            </div>
            <Button
              className="w-full bg-[#2b4d24] hover:bg-[#1a3a15]"
              disabled={!selectedCourseId || !draft.title.trim() || isSaving}
              onClick={() => void handleCreateAssignment()}
            >
              {isSaving ? "Saving..." : "Create Assignment"}
            </Button>
          </div>
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

      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-5 text-sm text-[#666666]">Loading assignments...</CardContent>
          </Card>
        ) : assignments.length === 0 ? (
          <Card>
            <CardContent className="p-5 text-sm text-[#666666]">
              No assignments yet for this course.
            </CardContent>
          </Card>
        ) : (
          assignments.map((assignment) => {
            const assignmentSubmissions = submissionsByAssignment[assignment.id] ?? [];
            return (
              <Card key={assignment.id} className="glass-subtle border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-lg text-[#1a1a1a]">
                    {assignment.title}
                    <Badge variant="outline" className="text-[10px]">
                      {assignment.pointsPossible} pts
                    </Badge>
                    <Badge variant={assignment.isPublished ? "default" : "secondary"} className="text-[10px]">
                      {assignment.isPublished ? "Published" : "Draft"}
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-[#666666]">
                    {assignment.description || "No description yet."}
                  </p>
                  <p className="text-xs text-[#999999]">
                    Due: {assignment.dueAt ? new Date(assignment.dueAt).toLocaleString() : "No due date"}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {assignment.instructions && (
                    <div className="rounded-lg border border-[#d6d6cf] bg-white/70 p-3 text-xs text-[#666666]">
                      {assignment.instructions}
                    </div>
                  )}
                  <div className="space-y-3">
                    {assignmentSubmissions.length === 0 ? (
                      <p className="text-xs text-[#999999]">No submissions yet.</p>
                    ) : (
                      assignmentSubmissions.map((submission) => {
                        const gradeDraft = gradeBySubmissionId[submission.id] ?? {
                          scorePercent: submission.scorePercent?.toString() ?? "",
                          feedback: submission.feedback ?? "",
                          status:
                            submission.status === "returned" || submission.status === "graded"
                              ? submission.status
                              : "graded",
                        };
                        return (
                          <div
                            key={submission.id}
                            className="rounded-lg border border-[#c5ccc2]/40 bg-white/80 p-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-[#1a1a1a]">
                                  {submission.userName ?? "Favor Partner"}
                                </p>
                                <p className="text-xs text-[#999999]">
                                  {submission.userEmail || "No email"} - {submission.status}
                                </p>
                              </div>
                              <Badge variant="secondary" className="text-[10px]">
                                Submitted{" "}
                                {submission.submittedAt
                                  ? new Date(submission.submittedAt).toLocaleDateString()
                                  : "Not yet"}
                              </Badge>
                            </div>
                            {submission.submissionText && (
                              <p className="mt-2 whitespace-pre-wrap text-xs text-[#666666]">
                                {submission.submissionText}
                              </p>
                            )}
                            {submission.submissionUrl && (
                              <a
                                className="mt-1 block text-xs text-[#2b4d24] underline"
                                href={submission.submissionUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open attachment
                              </a>
                            )}
                            <div className="mt-3 grid gap-2 sm:grid-cols-[100px_140px_1fr_auto]">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={gradeDraft.scorePercent}
                                onChange={(event) =>
                                  setGradeBySubmissionId((current) => ({
                                    ...current,
                                    [submission.id]: {
                                      ...gradeDraft,
                                      scorePercent: event.target.value,
                                    },
                                  }))
                                }
                                placeholder="%"
                              />
                              <Select
                                value={gradeDraft.status}
                                onValueChange={(value) =>
                                  setGradeBySubmissionId((current) => ({
                                    ...current,
                                    [submission.id]: {
                                      ...gradeDraft,
                                      status: value as "returned" | "graded",
                                    },
                                  }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="graded">Graded</SelectItem>
                                  <SelectItem value="returned">Returned</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                value={gradeDraft.feedback}
                                onChange={(event) =>
                                  setGradeBySubmissionId((current) => ({
                                    ...current,
                                    [submission.id]: {
                                      ...gradeDraft,
                                      feedback: event.target.value,
                                    },
                                  }))
                                }
                                placeholder="Feedback"
                              />
                              <Button
                                variant="outline"
                                disabled={isSaving}
                                onClick={() => void handleGradeSubmission(submission)}
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
