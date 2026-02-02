import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Tables } from '@/types/database';

export async function GET(request: NextRequest) {
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

    // Apply access level filtering based on constituent type
    const constituentType = userData.constituent_type;
    if (constituentType === 'individual' || constituentType === 'volunteer') {
      // Basic partners only see partner-level courses
      query = query.eq('access_level', 'partner');
    }

    const { data: courses, error: coursesError } = await query;

    if (coursesError) {
      console.error('Courses fetch error:', coursesError);
      return NextResponse.json(
        { error: 'Failed to fetch courses' },
        { status: 500 }
      );
    }

    // Fetch user's progress for these courses
    const { data: progress, error: progressError } = await supabase
      .from('user_course_progress')
      .select('*')
      .eq('user_id', session.user.id);

    if (progressError) {
      console.error('Progress fetch error:', progressError);
    }

    // Format the response
    const formattedCourses = courses?.map((course: Tables<'courses'>) => ({
      id: course.id,
      title: course.title,
      description: course.description,
      thumbnailUrl: course.thumbnail_url,
      accessLevel: course.access_level,
      sortOrder: course.sort_order,
      createdAt: course.created_at,
    })) || [];

    const formattedProgress = progress?.map((p: Tables<'user_course_progress'>) => ({
      moduleId: p.module_id,
      completed: p.completed,
      completedAt: p.completed_at,
      watchTimeSeconds: p.watch_time_seconds,
      lastWatchedAt: p.last_watched_at,
    })) || [];

    return NextResponse.json({
      success: true,
      courses: formattedCourses,
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
