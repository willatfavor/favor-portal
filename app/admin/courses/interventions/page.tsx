"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { isDevBypass } from "@/lib/dev-mode";
import { buildLmsRiskSignals, type LearnerRiskSignal } from "@/lib/lms/risk";
import {
  getMockAssignments,
  getMockAssignmentSubmissions,
  getMockCourses,
  getMockInterventions,
  getMockModules,
  getMockProgress,
  getMockUsers,
  upsertMockIntervention,
} from "@/lib/mock-store";
import type { LmsIntervention } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RiskCandidate extends LearnerRiskSignal {
  intervention: LmsIntervention | null;
}

interface InterventionDraft {
  status: "open" | "in_progress" | "resolved" | "dismissed";
  actionPlan: string;
  dueAt: string;
}

function toDateTimeLocal(value: string | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function fromDateTimeLocal(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export default function AdminLmsInterventionsPage() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<RiskCandidate[]>([]);
  const [allInterventions, setAllInterventions] = useState<LmsIntervention[]>([]);
  const [draftByCandidateKey, setDraftByCandidateKey] = useState<Record<string, InterventionDraft>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInterventions() {
      setIsLoading(true);
      setError(null);

      if (isDevBypass) {
        const users = getMockUsers();
        const courses = getMockCourses();
        const modules = getMockModules();
        const progress = getMockProgress();
        const assignments = getMockAssignments();
        const submissions = getMockAssignmentSubmissions();
        const interventions = getMockInterventions();

        const riskSignals = buildLmsRiskSignals({
          users: users.map((entry) => ({
            id: entry.id,
            firstName: entry.firstName,
            lastName: entry.lastName,
            email: entry.email,
          })),
          courses: courses.map((entry) => ({ id: entry.id, title: entry.title })),
          modules: modules.map((entry) => ({ id: entry.id, courseId: entry.courseId })),
          progressRows: progress.map((entry) => ({
            userId: entry.userId,
            moduleId: entry.moduleId,
            completed: entry.completed,
            completedAt: entry.completedAt,
            lastWatchedAt: entry.lastWatchedAt,
          })),
          assignments: assignments.map((entry) => ({
            id: entry.id,
            courseId: entry.courseId,
            dueAt: entry.dueAt,
            passingPercent: entry.passingPercent,
            isPublished: entry.isPublished,
          })),
          submissions: submissions.map((entry) => ({
            assignmentId: entry.assignmentId,
            userId: entry.userId,
            status: entry.status,
            scorePercent: entry.scorePercent,
            submittedAt: entry.submittedAt,
            gradedAt: entry.gradedAt,
          })),
        });

        const openMap = new Map<string, LmsIntervention>();
        for (const intervention of interventions) {
          if (intervention.status === "dismissed" || intervention.status === "resolved") continue;
          openMap.set(`${intervention.userId}:${intervention.courseId ?? ""}`, intervention);
        }
        setCandidates(
          riskSignals.map((signal) => ({
            ...signal,
            intervention: openMap.get(`${signal.userId}:${signal.courseId}`) ?? null,
          }))
        );
        setAllInterventions(interventions);
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/admin/lms/interventions");
      const json = (await response.json()) as {
        candidates?: RiskCandidate[];
        interventions?: LmsIntervention[];
        error?: string;
      };
      if (!response.ok) {
        setError(json.error ?? "Unable to load intervention data");
        setCandidates([]);
        setAllInterventions([]);
        setIsLoading(false);
        return;
      }

      setCandidates(json.candidates ?? []);
      setAllInterventions(json.interventions ?? []);
      setIsLoading(false);
    }

    void loadInterventions();
  }, []);

  const openCount = useMemo(
    () => allInterventions.filter((entry) => entry.status === "open" || entry.status === "in_progress").length,
    [allInterventions]
  );

  async function saveIntervention(candidate: RiskCandidate) {
    if (!user?.id) return;
    const draft = draftByCandidateKey[candidate.key] ?? {
      status: candidate.intervention?.status ?? "open",
      actionPlan: candidate.intervention?.actionPlan ?? "",
      dueAt: toDateTimeLocal(candidate.intervention?.dueAt),
    };

    setIsSaving(true);
    setError(null);
    setMessage(null);

    const payload = {
      id: candidate.intervention?.id,
      userId: candidate.userId,
      courseId: candidate.courseId,
      riskLevel: candidate.riskLevel,
      riskScore: candidate.riskScore,
      reason: candidate.reason,
      assignedTo: candidate.intervention?.assignedTo ?? user.id,
      status: draft.status,
      actionPlan: draft.actionPlan,
      dueAt: fromDateTimeLocal(draft.dueAt),
    } as const;

    if (isDevBypass) {
      const now = new Date().toISOString();
      const intervention: LmsIntervention = {
        id: candidate.intervention?.id ?? `intervention-${Date.now()}`,
        userId: payload.userId,
        courseId: payload.courseId,
        riskLevel: payload.riskLevel,
        riskScore: payload.riskScore,
        reason: payload.reason,
        assignedTo: payload.assignedTo,
        status: payload.status,
        actionPlan: payload.actionPlan || undefined,
        dueAt: payload.dueAt || undefined,
        resolvedAt: payload.status === "resolved" ? now : undefined,
        metadata: { source: "dev" },
        createdAt: candidate.intervention?.createdAt ?? now,
        updatedAt: now,
      };
      upsertMockIntervention(intervention);
      setCandidates((current) =>
        current.map((entry) =>
          entry.key === candidate.key
            ? {
                ...entry,
                intervention,
              }
            : entry
        )
      );
      setAllInterventions((current) => {
        const existing = current.find((entry) => entry.id === intervention.id);
        if (existing) {
          return current.map((entry) => (entry.id === intervention.id ? intervention : entry));
        }
        return [intervention, ...current];
      });
      setMessage("Intervention saved.");
      setIsSaving(false);
      return;
    }

    const response = await fetch("/api/admin/lms/interventions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await response.json()) as { intervention?: LmsIntervention; error?: string };
    if (!response.ok || !json.intervention) {
      setError(json.error ?? "Unable to save intervention");
      setIsSaving(false);
      return;
    }

    setCandidates((current) =>
      current.map((entry) =>
        entry.key === candidate.key ? { ...entry, intervention: json.intervention as LmsIntervention } : entry
      )
    );
    setAllInterventions((current) => {
      const existing = current.find((entry) => entry.id === json.intervention?.id);
      if (existing) {
        return current.map((entry) =>
          entry.id === json.intervention?.id ? (json.intervention as LmsIntervention) : entry
        );
      }
      return [json.intervention as LmsIntervention, ...current];
    });
    setMessage("Intervention saved.");
    setIsSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-[#1a1a1a]">At-Risk Interventions</h1>
          <p className="text-sm text-[#666666]">
            Detect learner drop-off early and track intervention workflows.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {candidates.length} at-risk learners
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {openCount} open interventions
          </Badge>
          <Button variant="outline" asChild>
            <Link href="/admin/courses">Back to LMS Admin</Link>
          </Button>
        </div>
      </div>

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
          <CardContent className="p-5 text-sm text-[#666666]">Loading intervention analytics...</CardContent>
        </Card>
      ) : candidates.length === 0 ? (
        <Card>
          <CardContent className="p-5 text-sm text-[#666666]">
            No at-risk learners detected right now.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {candidates.map((candidate) => {
            const draft = draftByCandidateKey[candidate.key] ?? {
              status: candidate.intervention?.status ?? "open",
              actionPlan: candidate.intervention?.actionPlan ?? "",
              dueAt: toDateTimeLocal(candidate.intervention?.dueAt),
            };

            return (
              <Card key={candidate.key} className="glass-subtle border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-lg text-[#1a1a1a]">
                    {candidate.userName}
                    <Badge variant="outline" className="text-[10px]">
                      {candidate.courseTitle}
                    </Badge>
                    <Badge
                      variant={candidate.riskLevel === "high" ? "destructive" : "secondary"}
                      className="text-[10px]"
                    >
                      {candidate.riskLevel.toUpperCase()} {candidate.riskScore}
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-[#666666]">
                    {candidate.reason}
                  </p>
                  <p className="text-xs text-[#999999]">
                    Completion {candidate.completionPercent}% - Overdue assignments {candidate.overdueAssignments} - Last active{" "}
                    {candidate.lastActiveAt ? new Date(candidate.lastActiveAt).toLocaleDateString() : "Unknown"}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-[180px_200px_auto]">
                    <Select
                      value={draft.status}
                      onValueChange={(value) =>
                        setDraftByCandidateKey((current) => ({
                          ...current,
                          [candidate.key]: {
                            ...draft,
                            status: value as InterventionDraft["status"],
                          },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="dismissed">Dismissed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="datetime-local"
                      value={draft.dueAt}
                      onChange={(event) =>
                        setDraftByCandidateKey((current) => ({
                          ...current,
                          [candidate.key]: {
                            ...draft,
                            dueAt: event.target.value,
                          },
                        }))
                      }
                    />
                    <Button disabled={isSaving} onClick={() => void saveIntervention(candidate)}>
                      Save
                    </Button>
                  </div>
                  <Textarea
                    rows={2}
                    placeholder="Intervention notes"
                    value={draft.actionPlan}
                    onChange={(event) =>
                      setDraftByCandidateKey((current) => ({
                        ...current,
                        [candidate.key]: {
                          ...draft,
                          actionPlan: event.target.value,
                        },
                      }))
                    }
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
