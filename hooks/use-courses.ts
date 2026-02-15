'use client';

import { useState, useEffect, useMemo } from 'react';
import { Course, CourseModule, UserCourseProgress } from '@/types';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';
import { isDevBypass } from '@/lib/dev-mode';
import {
  getMockCourses,
  getMockModules,
  getMockProgressForUser,
  upsertMockProgress,
  recordActivity,
} from '@/lib/mock-store';

interface UseCoursesReturn {
  courses: Course[];
  modules: CourseModule[];
  progress: UserCourseProgress[];
  isLoading: boolean;
  error: Error | null;
  updateProgress: (moduleId: string, updates: Partial<UserCourseProgress>) => Promise<void>;
}

export function useCourses(userId: string | undefined): UseCoursesReturn {
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [progress, setProgress] = useState<UserCourseProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = useMemo(() => createClient(), []);

  function mapCourse(c: Tables<'courses'>): Course {
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      thumbnailUrl: c.thumbnail_url || c.cover_image || undefined,
      accessLevel: c.access_level as Course['accessLevel'],
      sortOrder: c.sort_order,
      createdAt: c.created_at,
      status: (c.status as Course['status']) ?? 'published',
      isLocked: Boolean(c.is_locked),
      isPaid: Boolean(c.is_paid),
      price: Number(c.price ?? 0),
      tags: c.tags ?? [],
      coverImage: c.cover_image || undefined,
      enforceSequential: c.enforce_sequential ?? true,
    };
  }

  function mapModule(m: Tables<'course_modules'>): CourseModule {
    return {
      id: m.id,
      courseId: m.course_id,
      title: m.title,
      description: m.description || undefined,
      cloudflareVideoId: m.cloudflare_video_id,
      sortOrder: m.sort_order,
      durationSeconds: m.duration_seconds,
      type: (m.module_type as CourseModule['type']) ?? 'video',
      resourceUrl: m.resource_url || undefined,
      notes: m.notes || undefined,
      quizPayload:
        m.quiz_payload && typeof m.quiz_payload === 'object'
          ? (m.quiz_payload as Record<string, unknown>)
          : undefined,
      passThreshold: m.pass_threshold ?? 70,
    };
  }

  function mapProgress(p: Tables<'user_course_progress'>): UserCourseProgress {
    return {
      id: p.id,
      userId: p.user_id,
      moduleId: p.module_id,
      completed: p.completed,
      completedAt: p.completed_at || undefined,
      watchTimeSeconds: p.watch_time_seconds,
      lastWatchedAt: p.last_watched_at || undefined,
    };
  }

  useEffect(() => {
    async function fetchCourses() {
      try {
        setIsLoading(true);
        setError(null);

        if (isDevBypass) {
          const mockCourses = getMockCourses()
            .map((course) => ({
              ...course,
              enforceSequential: course.enforceSequential ?? true,
            }))
            .sort((a, b) => a.sortOrder - b.sortOrder);
          const mockModules = getMockModules().sort((a, b) => a.sortOrder - b.sortOrder);
          const mockProgress = getMockProgressForUser(userId);
          setCourses(mockCourses);
          setModules(mockModules);
          setProgress(mockProgress);
          return;
        }

        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('*')
          .order('sort_order', { ascending: true });

        if (coursesError) throw coursesError;

        setCourses(coursesData?.map(mapCourse) || []);

        const { data: modulesData, error: modulesError } = await supabase
          .from('course_modules')
          .select('*')
          .order('sort_order', { ascending: true });

        if (modulesError) throw modulesError;

        setModules(modulesData?.map(mapModule) || []);

        if (userId) {
          const { data: progressData, error: progressError } = await supabase
            .from('user_course_progress')
            .select('*')
            .eq('user_id', userId);

          if (progressError) throw progressError;

          setProgress(progressData?.map(mapProgress) || []);
        } else {
          setProgress([]);
        }

      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchCourses();
  }, [userId, supabase]);

  const updateProgress = async (moduleId: string, updates: Partial<UserCourseProgress>) => {
    if (!userId) return;
    const existing = progress.find((entry) => entry.moduleId === moduleId);
    const now = new Date().toISOString();
    const nextCompleted = updates.completed ?? existing?.completed ?? false;
    const nextWatchTime = updates.watchTimeSeconds ?? existing?.watchTimeSeconds ?? 0;
    const nextCompletedAt = nextCompleted
      ? updates.completedAt ?? existing?.completedAt ?? now
      : null;
    const nextLastWatchedAt = updates.lastWatchedAt ?? now;

    if (isDevBypass) {
      const entry: UserCourseProgress = {
        id: existing?.id ?? updates.id ?? `progress-${Date.now()}`,
        userId,
        moduleId,
        completed: nextCompleted,
        completedAt: nextCompletedAt ?? undefined,
        watchTimeSeconds: nextWatchTime,
        lastWatchedAt: nextLastWatchedAt,
      };
      upsertMockProgress(entry);
      const targetModule = getMockModules().find((m) => m.id === moduleId);
      recordActivity({
        id: `activity-${Date.now()}`,
        type: nextCompleted ? 'course_completed' : 'course_progress',
        userId,
        createdAt: now,
        metadata: {
          moduleId,
          courseId: targetModule?.courseId ?? '',
          completed: nextCompleted,
        },
      });
      setProgress(getMockProgressForUser(userId));
      return;
    }

    const { error: upsertError } = await supabase
      .from('user_course_progress')
      .upsert({
        user_id: userId,
        module_id: moduleId,
        completed: nextCompleted,
        completed_at: nextCompletedAt,
        watch_time_seconds: nextWatchTime,
        last_watched_at: nextLastWatchedAt,
      }, {
        onConflict: 'user_id,module_id',
      });

    if (upsertError) {
      setError(upsertError);
      return;
    }

    const { data: progressData, error: progressError } = await supabase
      .from('user_course_progress')
      .select('*')
      .eq('user_id', userId);

    if (progressError) {
      setError(progressError);
      return;
    }

    setProgress(progressData?.map(mapProgress) || []);
  };

  return { courses, modules, progress, isLoading, error, updateProgress };
}
