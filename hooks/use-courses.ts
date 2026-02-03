'use client';

import { useState, useEffect, useMemo } from 'react';
import { Course, UserCourseProgress } from '@/types';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';

interface UseCoursesReturn {
  courses: Course[];
  progress: UserCourseProgress[];
  isLoading: boolean;
  error: Error | null;
}

export function useCourses(userId: string | undefined): UseCoursesReturn {
  const [courses, setCourses] = useState<Course[]>([]);
  const [progress, setProgress] = useState<UserCourseProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function fetchCourses() {
      try {
        setIsLoading(true);

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
          accessLevel: c.access_level as any,
          sortOrder: c.sort_order,
          createdAt: c.created_at,
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

  return { courses, progress, isLoading, error };
}
