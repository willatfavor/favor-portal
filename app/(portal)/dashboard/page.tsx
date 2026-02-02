"use client";

import { useAuth } from "@/hooks/use-auth";
import { useGiving } from "@/hooks/use-giving";
import { useCourses } from "@/hooks/use-courses";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GivingSummary } from "@/components/giving/giving-summary";
import { CourseCard } from "@/components/courses/course-card";
import { Heart, GraduationCap, ArrowRight, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { user, isLoading: isUserLoading } = useAuth();
  const { totalGiven, ytdGiven, isLoading: isGivingLoading } = useGiving(user?.id);
  const { courses, progress, isLoading: isCoursesLoading } = useCourses(user?.id);

  const isLoading = isUserLoading || isGivingLoading || isCoursesLoading;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-[#666666]">Loading your dashboard...</div>
      </div>
    );
  }

  // Calculate course progress
  const inProgressCourses = courses.slice(0, 3);
  const totalModules = courses.length * 5; // Approximate
  const completedModules = progress.filter((p) => p.completed).length;
  const progressPercentage = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Cormorant_Garamond'] text-3xl font-semibold text-[#1a1a1a]">
            Welcome back, {user?.firstName}
          </h1>
          <p className="mt-1 text-[#666666]">
            Here&apos;s what&apos;s happening with your partnership with Favor International.
          </p>
        </div>
      </div>

      {/* Giving Summary */}
      <GivingSummary totalGiven={totalGiven} ytdGiven={ytdGiven} />

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-[#2b4d24] to-[#3d6633] text-[#FFFEF9]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#FFFEF9] flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Make a Gift
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-[#FFFEF9]/80">
              Support our mission to bring hope and transformation.
            </p>
            <Button variant="secondary" className="bg-[#FFFEF9] text-[#2b4d24] hover:bg-[#FFFEF9]/90" asChild>
              <Link href="/giving">Give Now</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-[#2b4d24]" />
              Continue Learning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-[#666666]">
              You&apos;ve completed {Math.round(progressPercentage)}% of available courses.
            </p>
            <Button variant="outline" asChild>
              <Link href="/courses">View Courses</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#2b4d24]" />
              Impact Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-[#666666]">
              Your giving has helped impact 1,200+ lives this year.
            </p>
            <Button variant="outline" asChild>
              <Link href="/giving/history">View Impact</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Courses */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-['Cormorant_Garamond'] text-2xl font-semibold text-[#1a1a1a]">
            Continue Learning
          </h2>
          <Button variant="ghost" className="text-[#2b4d24]" asChild>
            <Link href="/courses" className="flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {inProgressCourses.map((course) => {
            const courseProgress = progress.filter((p) => p.moduleId.startsWith(course.id));
            const completedCount = courseProgress.filter((p) => p.completed).length;
            const totalCount = courseProgress.length || 5; // Default to 5 if no data

            return (
              <CourseCard
                key={course.id}
                course={course}
                progress={completedCount}
                totalModules={totalCount}
              />
            );
          })}
          {inProgressCourses.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center">
                <GraduationCap className="mx-auto h-12 w-12 text-[#e5e5e0]" />
                <p className="mt-2 text-[#666666]">No courses available yet.</p>
                <Button className="mt-4" asChild>
                  <Link href="/courses">Browse Courses</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="font-['Cormorant_Garamond']">Recent Activity</CardTitle>
          <CardDescription>Your latest gifts and course progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-[#f5f5f0] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2b4d24]/10">
                  <Heart className="h-5 w-5 text-[#2b4d24]" />
                </div>
                <div>
                  <p className="font-medium text-[#1a1a1a]">Monthly Gift Processed</p>
                  <p className="text-sm text-[#666666]">Your recurring gift was received</p>
                </div>
              </div>
              <span className="text-sm text-[#666666]">Today</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[#f5f5f0] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2b4d24]/10">
                  <GraduationCap className="h-5 w-5 text-[#2b4d24]" />
                </div>
                <div>
                  <p className="font-medium text-[#1a1a1a]">New Course Available</p>
                  <p className="text-sm text-[#666666]">&quot;Partnership Foundations&quot; is now open</p>
                </div>
              </div>
              <span className="text-sm text-[#666666]">2 days ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
