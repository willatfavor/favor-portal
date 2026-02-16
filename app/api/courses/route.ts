import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Tables } from '@/types/database';
import { COURSE_ACCESS_LEVELS } from '@/lib/constants';

export async function GET() {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's constituent type for access level filtering
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('constituent_type')
      .eq('id', session.user.id)
      .single();

    if (userError) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch courses from Supabase
    // Filter by access level based on user's constituent type
    let query = supabase
      .from('courses')
      .select('*')
      .order('sort_order', { ascending: true });

    const constituentType = userData.constituent_type;
    const allowedAccessLevels = Object.entries(COURSE_ACCESS_LEVELS)
      .filter(([, allowedTypes]) => allowedTypes.includes(constituentType))
      .map(([accessLevel]) => accessLevel);

    if (allowedAccessLevels.length > 0) {
      query = query.in('access_level', allowedAccessLevels);
    } else {
      return NextResponse.json(
        { success: true, courses: [], modules: [], progress: [] },
        { status: 200 }
      );
    }

    query = query
      .eq('status', 'published')
      .eq('is_locked', false);

    const { data: courses, error: coursesError } = await query;

    if (coursesError) {
      console.error('Courses fetch error:', coursesError);
      return NextResponse.json(
        { error: 'Failed to fetch courses' },
        { status: 500 }
      );
    }

    const courseIds = (courses ?? []).map((course) => course.id);

    // Fetch modules for accessible courses
    const { data: modules, error: modulesError } = await supabase
      .from('course_modules')
      .select('*')
      .in('course_id', courseIds)
      .order('sort_order', { ascending: true });

    if (modulesError) {
      console.error('Modules fetch error:', modulesError);
      return NextResponse.json(
        { error: 'Failed to fetch course modules' },
        { status: 500 }
      );
    }

    const moduleIds = (modules ?? []).map((module) => module.id);

    let progress: Tables<'user_course_progress'>[] | null = [];
    if (moduleIds.length > 0) {
      const { data: progressData, error: progressError } = await supabase
        .from('user_course_progress')
        .select('*')
        .eq('user_id', session.user.id)
        .in('module_id', moduleIds);

      if (progressError) {
        console.error('Progress fetch error:', progressError);
      } else {
        progress = progressData;
      }
    }

    // Format the response
    const formattedCourses = courses?.map((course: Tables<'courses'>) => ({
      id: course.id,
      title: course.title,
      description: course.description,
      thumbnailUrl: course.thumbnail_url,
      accessLevel: course.access_level,
      sortOrder: course.sort_order,
      status: course.status ?? 'published',
      isLocked: Boolean(course.is_locked),
      isPaid: Boolean(course.is_paid),
      price: Number(course.price ?? 0),
      tags: course.tags,
      coverImage: course.cover_image,
      enforceSequential: course.enforce_sequential ?? true,
      publishAt: course.publish_at,
      unpublishAt: course.unpublish_at,
      createdAt: course.created_at,
    })) || [];

    const formattedModules = modules?.map((module: Tables<'course_modules'>) => ({
      id: module.id,
      courseId: module.course_id,
      title: module.title,
      description: module.description,
      cloudflareVideoId: module.cloudflare_video_id,
      sortOrder: module.sort_order,
      durationSeconds: module.duration_seconds,
      type: module.module_type ?? 'video',
      resourceUrl: module.resource_url,
      notes: module.notes,
      quizPayload: module.quiz_payload,
      passThreshold: module.pass_threshold ?? 70,
    })) || [];

    const formattedProgress = progress?.map((p) => ({
      moduleId: p.module_id,
      completed: p.completed,
      completedAt: p.completed_at,
      watchTimeSeconds: p.watch_time_seconds,
      lastWatchedAt: p.last_watched_at,
    })) || [];

    return NextResponse.json({
      success: true,
      courses: formattedCourses,
      modules: formattedModules,
      progress: formattedProgress,
    }, { status: 200 });
  } catch (error) {
    console.error('Courses route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
