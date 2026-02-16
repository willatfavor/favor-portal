import type { CourseAssignmentSubmissionStatus } from "@/types";

export interface RiskUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface RiskCourse {
  id: string;
  title: string;
}

export interface RiskModule {
  id: string;
  courseId: string;
}

export interface RiskProgressRow {
  userId: string;
  moduleId: string;
  completed: boolean;
  lastWatchedAt?: string | null;
  completedAt?: string | null;
}

export interface RiskAssignmentRow {
  id: string;
  courseId: string;
  dueAt?: string | null;
  passingPercent: number;
  isPublished: boolean;
}

export interface RiskSubmissionRow {
  assignmentId: string;
  userId: string;
  status: CourseAssignmentSubmissionStatus;
  scorePercent?: number | null;
  submittedAt?: string | null;
  gradedAt?: string | null;
}

export interface LearnerRiskSignal {
  key: string;
  userId: string;
  userName: string;
  userEmail: string;
  courseId: string;
  courseTitle: string;
  riskScore: number;
  riskLevel: "medium" | "high";
  reason: string;
  completionPercent: number;
  overdueAssignments: number;
  lowScoreAssignments: number;
  lastActiveAt: string | null;
}

interface BuildRiskInput {
  users: RiskUser[];
  courses: RiskCourse[];
  modules: RiskModule[];
  progressRows: RiskProgressRow[];
  assignments: RiskAssignmentRow[];
  submissions: RiskSubmissionRow[];
  now?: Date;
}

function daysBetween(now: Date, isoValue: string): number {
  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) return 0;
  return Math.floor((now.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24));
}

function riskLevelFromScore(score: number): "medium" | "high" | null {
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return null;
}

export function buildLmsRiskSignals(input: BuildRiskInput): LearnerRiskSignal[] {
  const now = input.now ?? new Date();
  const modulesByCourse = input.modules.reduce<Map<string, Set<string>>>((acc, module) => {
    const entry = acc.get(module.courseId) ?? new Set<string>();
    entry.add(module.id);
    acc.set(module.courseId, entry);
    return acc;
  }, new Map<string, Set<string>>());

  const moduleToCourse = input.modules.reduce<Map<string, string>>((acc, module) => {
    acc.set(module.id, module.courseId);
    return acc;
  }, new Map<string, string>());

  const progressByUserCourse = new Map<string, RiskProgressRow[]>();
  for (const row of input.progressRows) {
    const courseId = moduleToCourse.get(row.moduleId);
    if (!courseId) continue;
    const key = `${row.userId}:${courseId}`;
    const rows = progressByUserCourse.get(key) ?? [];
    rows.push(row);
    progressByUserCourse.set(key, rows);
  }

  const assignmentsByCourse = input.assignments.reduce<Map<string, RiskAssignmentRow[]>>((acc, assignment) => {
    if (!assignment.isPublished) return acc;
    const rows = acc.get(assignment.courseId) ?? [];
    rows.push(assignment);
    acc.set(assignment.courseId, rows);
    return acc;
  }, new Map<string, RiskAssignmentRow[]>());

  const submissionsByAssignmentUser = input.submissions.reduce<Map<string, RiskSubmissionRow>>((acc, submission) => {
    acc.set(`${submission.assignmentId}:${submission.userId}`, submission);
    return acc;
  }, new Map<string, RiskSubmissionRow>());

  const signals: LearnerRiskSignal[] = [];

  for (const user of input.users) {
    for (const course of input.courses) {
      const courseAssignments = assignmentsByCourse.get(course.id) ?? [];
      const progressKey = `${user.id}:${course.id}`;
      const courseProgress = progressByUserCourse.get(progressKey) ?? [];
      const courseModules = modulesByCourse.get(course.id) ?? new Set<string>();

      const started = courseProgress.length > 0 || courseAssignments.length > 0;
      if (!started) continue;

      const completedModules = courseProgress.filter((row) => row.completed).length;
      const totalModules = courseModules.size;
      const completionPercent = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

      let lastActiveAt: string | null = null;
      for (const row of courseProgress) {
        const candidate = row.completedAt ?? row.lastWatchedAt;
        if (!candidate) continue;
        if (!lastActiveAt || candidate > lastActiveAt) {
          lastActiveAt = candidate;
        }
      }

      let overdueAssignments = 0;
      let lowScoreAssignments = 0;
      for (const assignment of courseAssignments) {
        const submission = submissionsByAssignmentUser.get(`${assignment.id}:${user.id}`);
        const dueAt = assignment.dueAt ?? null;
        if (dueAt && daysBetween(now, dueAt) > 0) {
          if (!submission || submission.status === "returned" || submission.status === "draft") {
            overdueAssignments += 1;
          }
        }

        const score = submission?.scorePercent ?? null;
        if (score !== null && score < assignment.passingPercent) {
          lowScoreAssignments += 1;
        }

        const submissionActivity = submission?.gradedAt ?? submission?.submittedAt ?? null;
        if (submissionActivity && (!lastActiveAt || submissionActivity > lastActiveAt)) {
          lastActiveAt = submissionActivity;
        }
      }

      let riskScore = 0;
      const reasons: string[] = [];

      if (completionPercent < 35) {
        riskScore += 35;
        reasons.push("completion is below 35%");
      } else if (completionPercent < 55) {
        riskScore += 20;
        reasons.push("completion is below 55%");
      }

      if (lastActiveAt) {
        const inactiveDays = daysBetween(now, lastActiveAt);
        if (inactiveDays >= 30) {
          riskScore += 45;
          reasons.push("inactive for 30+ days");
        } else if (inactiveDays >= 14) {
          riskScore += 30;
          reasons.push("inactive for 14+ days");
        }
      } else {
        riskScore += 30;
        reasons.push("no activity recorded");
      }

      if (overdueAssignments > 0) {
        riskScore += Math.min(30, overdueAssignments * 15);
        reasons.push(`${overdueAssignments} overdue assignment${overdueAssignments > 1 ? "s" : ""}`);
      }

      if (lowScoreAssignments > 0) {
        riskScore += Math.min(20, lowScoreAssignments * 10);
        reasons.push(`${lowScoreAssignments} low-score assignment${lowScoreAssignments > 1 ? "s" : ""}`);
      }

      if (completionPercent === 0 && overdueAssignments > 0) {
        riskScore += 10;
      }

      riskScore = Math.min(100, riskScore);
      const level = riskLevelFromScore(riskScore);
      if (!level) continue;

      const reason = reasons.length > 0 ? reasons.slice(0, 3).join(", ") : "engagement risk detected";
      signals.push({
        key: `${user.id}:${course.id}`,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`.trim(),
        userEmail: user.email,
        courseId: course.id,
        courseTitle: course.title,
        riskScore,
        riskLevel: level,
        reason,
        completionPercent,
        overdueAssignments,
        lowScoreAssignments,
        lastActiveAt,
      });
    }
  }

  return signals.sort((a, b) => b.riskScore - a.riskScore || a.userName.localeCompare(b.userName));
}
