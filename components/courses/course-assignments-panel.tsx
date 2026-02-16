"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { isDevBypass } from "@/lib/dev-mode";
import {
  getMockAssignmentSubmissionForUser,
  getMockAssignmentSubmissions,
  getMockAssignmentsForCourse,
  upsertMockAssignmentSubmission,
} from "@/lib/mock-store";
import type {
  CourseAssignment,
  CourseAssignmentSubmission,
  CourseAssignmentSubmissionStatus,
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface SubmissionView extends CourseAssignmentSubmission {
  userName?: string;
  userEmail?: string;
}

interface AssignmentDraft {
  submissionText: string;
  submissionUrl: string;
}

interface Props {
  courseId: string;
  userId?: string;
  canManageLms: boolean;
}

function normalizeStatus(
  value: string | undefined
): CourseAssignmentSubmissionStatus {
  if (value === "draft" || value === "submitted" || value === "returned" || value === "graded") {
    return value;
  }
  return "submitted";
}

export function CourseAssignmentsPanel({ courseId, userId, canManageLms }: Props) {
  const [assignments, setAssignments] = useState<CourseAssignment[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionView[]>([]);
  const [draftByAssignmentId, setDraftByAssignmentId] = useState<Record<string, AssignmentDraft>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAssignments() {
      if (!courseId) return;
      setIsLoading(true);
      setError(null);
      setMessage(null);

      if (isDevBypass) {
        const assignmentRows = getMockAssignmentsForCourse(courseId, canManageLms);
        const submissionRows = getMockAssignmentSubmissions()
          .filter((submission) => assignmentRows.some((assignment) => assignment.id === submission.assignmentId))
          .filter((submission) => canManageLms || submission.userId === userId)
          .map((submission) => ({
            ...submission,
            status: normalizeStatus(submission.status),
          }));
        setAssignments(assignmentRows);
        setSubmissions(submissionRows);
        setIsLoading(false);
        return;
      }

      const response = await fetch(`/api/lms/assignments?courseId=${encodeURIComponent(courseId)}`);
      const json = (await response.json()) as {
        assignments?: CourseAssignment[];
        submissions?: Array<SubmissionView & { status?: string }>;
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
          status: normalizeStatus(entry.status),
        }))
      );
      setIsLoading(false);
    }

    void loadAssignments();
  }, [canManageLms, courseId, userId]);

  const ownSubmissionByAssignmentId = useMemo(() => {
    if (canManageLms) return new Map<string, SubmissionView>();
    return new Map(
      submissions
        .filter((submission) => submission.userId === userId)
        .map((submission) => [submission.assignmentId, submission])
    );
  }, [canManageLms, submissions, userId]);

  const submissionsByAssignmentId = useMemo(() => {
    return submissions.reduce<Record<string, SubmissionView[]>>((acc, submission) => {
      acc[submission.assignmentId] = acc[submission.assignmentId] || [];
      acc[submission.assignmentId].push(submission);
      return acc;
    }, {});
  }, [submissions]);

  async function submitAssignment(assignment: CourseAssignment) {
    if (!userId) return;
    const draft = draftByAssignmentId[assignment.id];
    const submissionText = draft?.submissionText?.trim() ?? "";
    const submissionUrl = draft?.submissionUrl?.trim() ?? "";
    if (!submissionText && !submissionUrl) return;

    setIsSaving(true);
    setError(null);
    setMessage(null);

    if (isDevBypass) {
      const now = new Date().toISOString();
      const existing = getMockAssignmentSubmissionForUser(assignment.id, userId);
      const next: SubmissionView = {
        id: existing?.id ?? `submission-${Date.now()}`,
        assignmentId: assignment.id,
        userId,
        submissionText: submissionText || undefined,
        submissionUrl: submissionUrl || undefined,
        status: "submitted",
        scorePercent: existing?.scorePercent,
        graderUserId: existing?.graderUserId,
        feedback: existing?.feedback,
        submittedAt: now,
        gradedAt: existing?.gradedAt,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      upsertMockAssignmentSubmission(next);
      setSubmissions((current) => {
        const without = current.filter(
          (entry) => !(entry.assignmentId === assignment.id && entry.userId === userId)
        );
        return [next, ...without];
      });
      setDraftByAssignmentId((current) => ({
        ...current,
        [assignment.id]: { submissionText: "", submissionUrl: "" },
      }));
      setMessage("Submission saved.");
      setIsSaving(false);
      return;
    }

    const response = await fetch(`/api/lms/assignments/${assignment.id}/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submissionText: submissionText || undefined,
        submissionUrl: submissionUrl || undefined,
        status: "submitted",
      }),
    });
    const json = (await response.json()) as {
      submission?: SubmissionView & { status?: string };
      error?: string;
    };
    if (!response.ok || !json.submission) {
      setError(json.error ?? "Unable to submit assignment");
      setIsSaving(false);
      return;
    }

    const nextSubmission: SubmissionView = {
      ...json.submission,
      status: normalizeStatus(json.submission.status),
    };
    setSubmissions((current) => {
      const without = current.filter(
        (entry) =>
          !(
            entry.assignmentId === nextSubmission.assignmentId &&
            entry.userId === nextSubmission.userId
          )
      );
      return [nextSubmission, ...without];
    });
    setDraftByAssignmentId((current) => ({
      ...current,
      [assignment.id]: { submissionText: "", submissionUrl: "" },
    }));
    setMessage("Submission saved.");
    setIsSaving(false);
  }

  return (
    <Card className="glass-subtle border-0">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg text-[#1a1a1a]">
          <span>Assignments</span>
          {canManageLms && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/courses/assignments">Grade in Admin</Link>
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && <p className="text-xs text-[#2b4d24]">{message}</p>}
        {error && <p className="text-xs text-[#a36d4c]">{error}</p>}

        {isLoading ? (
          <p className="text-xs text-[#999999]">Loading assignments...</p>
        ) : assignments.length === 0 ? (
          <p className="text-xs text-[#999999]">No assignments for this course yet.</p>
        ) : (
          assignments.map((assignment) => {
            const ownSubmission = ownSubmissionByAssignmentId.get(assignment.id);
            const draft = draftByAssignmentId[assignment.id] ?? {
              submissionText: "",
              submissionUrl: "",
            };
            const assignmentSubmissions = submissionsByAssignmentId[assignment.id] ?? [];
            return (
              <div
                key={assignment.id}
                className="rounded-xl border border-[#c5ccc2]/40 bg-white/80 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-[#1a1a1a]">{assignment.title}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {assignment.pointsPossible} pts
                  </Badge>
                  {assignment.dueAt && (
                    <Badge variant="secondary" className="text-[10px]">
                      Due {new Date(assignment.dueAt).toLocaleDateString()}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-[#666666]">
                  {assignment.description || "No assignment description provided."}
                </p>
                {assignment.instructions && (
                  <p className="mt-1 whitespace-pre-wrap text-xs text-[#8b957b]">
                    {assignment.instructions}
                  </p>
                )}

                {canManageLms ? (
                  <p className="mt-2 text-xs text-[#999999]">
                    {assignmentSubmissions.length} submission{assignmentSubmissions.length === 1 ? "" : "s"} received.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {ownSubmission && (
                      <div className="rounded-md border border-[#d6d6cf] bg-white/70 p-2 text-xs text-[#666666]">
                        <p>Status: {ownSubmission.status}</p>
                        {typeof ownSubmission.scorePercent === "number" && (
                          <p>Score: {ownSubmission.scorePercent}%</p>
                        )}
                        {ownSubmission.feedback && <p>Feedback: {ownSubmission.feedback}</p>}
                      </div>
                    )}
                    <Textarea
                      rows={3}
                      placeholder="Write your submission"
                      value={draft.submissionText}
                      onChange={(event) =>
                        setDraftByAssignmentId((current) => ({
                          ...current,
                          [assignment.id]: {
                            ...draft,
                            submissionText: event.target.value,
                          },
                        }))
                      }
                    />
                    <Input
                      placeholder="Optional link"
                      value={draft.submissionUrl}
                      onChange={(event) =>
                        setDraftByAssignmentId((current) => ({
                          ...current,
                          [assignment.id]: {
                            ...draft,
                            submissionUrl: event.target.value,
                          },
                        }))
                      }
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isSaving}
                      onClick={() => void submitAssignment(assignment)}
                    >
                      Submit Assignment
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
