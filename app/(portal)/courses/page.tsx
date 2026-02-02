"use client";

import { useAuth } from "@/hooks/use-auth";
import { useCourses } from "@/hooks/use-courses";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CourseCard } from "@/components/courses/course-card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function CoursesPage() {
  const { user } = useAuth();
  const { courses, progress, isLoading } = useCourses(user?.id);
  const [searchQuery, setSearchQuery] = useState("");

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-[#666666]">Loading courses...</div>
      </div>
    );
  }

  const filteredCourses = courses.filter(
    (course) =>
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats
  const completedCourses = courses.filter((course) => {
    const courseProgress = progress.filter((p) => p.moduleId.startsWith(course.id));
    return courseProgress.length > 0 && courseProgress.every((p) => p.completed);
  }).length;

  const inProgressCourses = courses.filter((course) => {
    const courseProgress = progress.filter((p) => p.moduleId.startsWith(course.id));
    return courseProgress.some((p) => p.completed) && !courseProgress.every((p) => p.completed);
  }).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-['Cormorant_Garamond'] text-3xl font-semibold text-[#1a1a1a]">
            Course Catalog
          </h1>
          <p className="mt-1 text-[#666666]">
            Deepen your understanding of Favor&apos;s mission and impact through our partner courses.
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666666]" />
          <Input
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#666666]">Total Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#1a1a1a]">{courses.length}</p>
            <p className="text-xs text-[#666666]">Available to you</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#666666]">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#2b4d24]">{completedCourses}</p>
            <p className="text-xs text-[#666666]">Courses finished</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#666666]">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#1a1a1a]">{inProgressCourses}</p>
            <p className="text-xs text-[#666666]">Active courses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#666666]">Your Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#1a1a1a]">
              {courses.length > 0 ? Math.round((completedCourses / courses.length) * 100) : 0}%
            </p>
            <p className="text-xs text-[#666666]">Completion rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Course Grid */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-[#2b4d24]" />
          <h2 className="font-['Cormorant_Garamond'] text-2xl font-semibold text-[#1a1a1a]">
            All Courses
          </h2>
          <Badge variant="secondary" className="ml-2">
            {filteredCourses.length}
          </Badge>
        </div>

        {filteredCourses.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course) => {
              const courseProgress = progress.filter((p) => p.moduleId.startsWith(course.id));
              const completedCount = courseProgress.filter((p) => p.completed).length;
              const totalCount = courseProgress.length || 5;

              return (
                <CourseCard
                  key={course.id}
                  course={course}
                  progress={completedCount}
                  totalModules={totalCount}
                />
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <GraduationCap className="mx-auto h-12 w-12 text-[#e5e5e0]" />
              <p className="mt-4 text-[#666666]">
                {searchQuery ? "No courses match your search." : "No courses available yet."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
