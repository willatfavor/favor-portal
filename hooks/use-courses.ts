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

  useEffect(() => {
    async function fetchCourses() {
      try {
        setIsLoading(true);

        if (isDevBypass) {
          const mockCourses = getMockCourses().sort((a, b) => a.sortOrder - b.sortOrder);
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

        setCourses(coursesData?.map((c: Tables<'courses'>) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          thumbnailUrl: c.thumbnail_url || undefined,
          accessLevel: c.access_level as Course["accessLevel"],
          sortOrder: c.sort_order,
          createdAt: c.created_at,
        })) || []);

        const { data: modulesData, error: modulesError } = await supabase
          .from('course_modules')
          .select('*')
          .order('sort_order', { ascending: true });

        if (modulesError) throw modulesError;

        setModules(modulesData?.map((m: Tables<'course_modules'>) => ({
          id: m.id,
          courseId: m.course_id,
          title: m.title,
          description: m.description || undefined,
          cloudflareVideoId: m.cloudflare_video_id,
          sortOrder: m.sort_order,
          durationSeconds: m.duration_seconds,
        })) || []);

        if (userId) {
          const { data: progressData, error: progressError } = await supabase
            .from('user_course_progress')
            .select('*')
            .eq('user_id', userId);

          if (progressError) throw progressError;

          setProgress(progressData?.map((p: Tables<'user_course_progress'>) => ({
            id: p.id,
            userId: p.user_id,
            moduleId: p.module_id,
            completed: p.completed,
            completedAt: p.completed_at || undefined,
            watchTimeSeconds: p.watch_time_seconds,
            lastWatchedAt: p.last_watched_at || undefined,
          })) || []);
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

    if (isDevBypass) {
      const entry: UserCourseProgress = {
        id: updates.id ?? `progress-${Date.now()}`,
        userId,
        moduleId,
        completed: updates.completed ?? false,
        completedAt: updates.completed ? new Date().toISOString() : updates.completedAt,
        watchTimeSeconds: updates.watchTimeSeconds ?? 0,
        lastWatchedAt: new Date().toISOString(),
      };
      upsertMockProgress(entry);
      const targetModule = getMockModules().find((m) => m.id === moduleId);
      recordActivity({
        id: `activity-${Date.now()}`,
        type: updates.completed ? 'course_completed' : 'course_progress',
        userId,
        createdAt: new Date().toISOString(),
        metadata: {
          moduleId,
          courseId: targetModule?.courseId ?? '',
          completed: updates.completed ?? false,
        },
      });
      setProgress(getMockProgressForUser(userId));
      return;
    }

    await supabase
      .from('user_course_progress')
      .upsert({
        user_id: userId,
        module_id: moduleId,
        completed: updates.completed ?? false,
        completed_at: updates.completed ? new Date().toISOString() : null,
        watch_time_seconds: updates.watchTimeSeconds ?? 0,
        last_watched_at: new Date().toISOString(),
      });

    const { data: progressData } = await supabase
      .from('user_course_progress')
      .select('*')
      .eq('user_id', userId);

    setProgress(progressData?.map((p: Tables<'user_course_progress'>) => ({
      id: p.id,
      userId: p.user_id,
      moduleId: p.module_id,
      completed: p.completed,
      completedAt: p.completed_at || undefined,
      watchTimeSeconds: p.watch_time_seconds,
      lastWatchedAt: p.last_watched_at || undefined,
    })) || []);
  };

  return { courses, modules, progress, isLoading, error, updateProgress };
}
