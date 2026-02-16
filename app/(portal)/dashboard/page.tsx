"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useGiving } from "@/hooks/use-giving";
import { useCourses } from "@/hooks/use-courses";
import { useContent } from "@/hooks/use-content";
import { useGrants } from "@/hooks/use-grants";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Heart,
  GraduationCap,
  ArrowRight,
  Calendar,
  BookOpen,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { SectionHeader } from "@/components/portal/section-header";
import { ModuleTile } from "@/components/portal/module-tile";
import { NewsCarousel } from "@/components/portal/news-carousel";
import { EmptyState } from "@/components/portal/empty-state";
import { GiveNowDialog } from "@/components/portal/give-now-dialog";
import { ContactSupportDialog } from "@/components/portal/contact-support-dialog";
import { NEWS_FEED, MODULE_TILES } from "@/lib/portal-mock-data";
import { canAccessCourse, canAccessContent, getGivingTier } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import type { ConstituentType } from "@/types";

export default function DashboardPage() {
  const { user, isLoading: isUserLoading } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const { totalGiven, ytdGiven, gifts, isLoading: isGivingLoading } = useGiving(user?.id, refreshKey);
  const { courses, modules, progress, isLoading: isCoursesLoading } = useCourses(user?.id);
  const { items: contentItems, isLoading: isContentLoading } = useContent();
  const { grants, isLoading: isGrantsLoading } = useGrants(user?.id);

  const isLoading = isUserLoading || isGivingLoading || isCoursesLoading || isContentLoading || isGrantsLoading;

  const userType = (user?.constituentType ?? "individual") as ConstituentType;

  const accessibleCourses = courses.filter((course) =>
    canAccessCourse(course.accessLevel, userType) &&
    course.status !== "draft" &&
    !course.isLocked
  );
  const accessibleCourseIds = new Set(accessibleCourses.map((course) => course.id));
  const accessibleModules = modules.filter((module) => accessibleCourseIds.has(module.courseId));
  const completedModules = progress.filter(
    (p) => p.completed && accessibleModules.some((m) => m.id === p.moduleId)
  ).length;
  const totalModules = accessibleModules.length;
  const progressPercentage =
    totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  const tier = getGivingTier((user?.lifetimeGivingTotal ?? 0) + totalGiven);

  const accessibleContent = contentItems.filter((item) =>
    canAccessContent(item.accessLevel, userType)
  );
  const baseRecommended = accessibleContent.slice(0, 3);

  const roleExperience = (() => {
    switch (userType) {
      case "foundation": {
        const active = grants.filter((g) => g.status === "active");
        const nextReport = active.find((g) => g.nextReportDue)?.nextReportDue;
        return {
          anchorId: "foundation",
          highlights: {
            title: "Grant Portfolio",
            subtitle: "Reporting cadence and active funding milestones",
            items: [
              {
                title: "Active Grants",
                value: `${active.length}`,
                description: "Currently funded initiatives",
              },
              {
                title: "Next Report Due",
                value: nextReport ? new Date(nextReport).toLocaleDateString() : "None scheduled",
                description: "Upcoming reporting deadline",
              },
              {
                title: "Board Materials",
                value: "Prepared",
                description: "Latest briefing packet is ready",
                actionLabel: "View reports",
                actionHref: "/content?type=report",
              },
            ],
          },
          actionsTitle: "Foundation Actions",
          actionsSubtitle: "Keep grant reporting and stewardship aligned",
          actions: [
            {
              title: "Grant Reporting Timeline",
              description: "Track milestones and report submissions",
              actionLabel: "Open timeline",
              actionHref: "/giving?view=grants",
            },
            {
              title: "Impact Metrics Snapshot",
              description: "Board-ready metrics updated weekly",
              actionLabel: "Download metrics",
              actionHref: "/content?tag=foundation",
            },
            {
              title: "Site Visit Requests",
              description: "Coordinate visits and field updates",
              actionLabel: "Request visit",
              actionHref: "/content?tag=site-visit",
            },
          ],
          recommendedTags: ["grant", "report", "foundation", "board"],
          contentTitle: "Board-ready resources",
          contentSubtitle: "Briefings and reports curated for your team",
        };
      }
      case "church":
        return {
          anchorId: "church",
          highlights: {
            title: "Congregation Briefing",
            subtitle: "Resources and engagement tools for your church",
            items: [
              {
                title: "Mission Sunday Kit",
                value: "Updated",
                description: "Slides, videos, and bulletin inserts",
                actionLabel: "Open resources",
                actionHref: "/content?tag=church",
              },
              {
                title: "Upcoming Events",
                value: "2",
                description: "Partner gatherings in the next 60 days",
              },
              {
                title: "Material Requests",
                value: "Ready",
                description: "Order brochures and prayer guides",
              },
            ],
          },
          actionsTitle: "Church Actions",
          actionsSubtitle: "Keep your congregation connected",
          actions: [
            {
              title: "Plan Mission Sunday",
              description: "Invite Favor for a Sunday feature",
              actionLabel: "View toolkit",
              actionHref: "/content?tag=mission-sunday",
            },
            {
              title: "Congregation Engagement",
              description: "Prayer prompts and small-group guides",
              actionLabel: "Download guides",
              actionHref: "/content?tag=church",
            },
            {
              title: "Bulk Materials",
              description: "Order brochures and prayer guides",
              actionLabel: "Request materials",
              actionHref: "/content?tag=materials",
            },
          ],
          recommendedTags: ["church", "pastor", "resource", "event"],
          contentTitle: "Church resources",
          contentSubtitle: "Materials designed for congregational use",
        };
      case "daf": {
        const dafTotal = gifts
          .filter((g) => g.designation.toLowerCase().includes("daf"))
          .reduce((sum, g) => sum + g.amount, 0);
        return {
          anchorId: "daf",
          highlights: {
            title: "Grant Recommendation Snapshot",
            subtitle: "Stewardship details and recommended next steps",
            items: [
              {
                title: "DAF Giving YTD",
                value: formatCurrency(dafTotal),
                description: "Based on portal activity",
              },
              {
                title: "Grant Checklist",
                value: "Available",
                description: "Steps to submit your next recommendation",
                actionLabel: "Open checklist",
                actionHref: "/giving?view=daf",
              },
              {
                title: "RDD Contact",
                value: user?.rddAssignment ?? "Partner Care",
                description: "Your DAF support contact",
              },
            ],
          },
          actionsTitle: "DAF Actions",
          actionsSubtitle: "Simplify your recommendation workflow",
          actions: [
            {
              title: "Start a Recommendation",
              description: "Prepare your next DAF grant",
              actionLabel: "Open checklist",
              actionHref: "/giving?view=daf",
            },
            {
              title: "DAF Documentation",
              description: "Download letters and EIN details",
              actionLabel: "View docs",
              actionHref: "/content?tag=daf",
            },
            {
              title: "Stewardship Summary",
              description: "Year-to-date impact summary",
              actionLabel: "View summary",
              actionHref: "/content?type=report",
            },
          ],
          recommendedTags: ["daf", "report", "grant"],
          contentTitle: "DAF-ready documentation",
          contentSubtitle: "Letters and summaries for your provider",
        };
      }
      case "ambassador":
        return {
          anchorId: "ambassador",
          highlights: {
            title: "Advocacy Briefing",
            subtitle: "Momentum, outreach, and next actions",
            items: [
              {
                title: "Campaign Momentum",
                value: "Rising",
                description: "Engagement up 12% this month",
              },
              {
                title: "Shareable Assets",
                value: "6 new",
                description: "Updated ambassador toolkit",
                actionLabel: "View assets",
                actionHref: "/content?tag=ambassador",
              },
              {
                title: "Next Event",
                value: "April 9",
                description: "Ambassador Training Day",
              },
            ],
          },
          actionsTitle: "Ambassador Actions",
          actionsSubtitle: "Tools to help you advocate",
          actions: [
            {
              title: "Shareable Assets",
              description: "Download the latest toolkit",
              actionLabel: "Open toolkit",
              actionHref: "/content?tag=ambassador",
            },
            {
              title: "Upcoming Training",
              description: "Register for the next cohort",
              actionLabel: "View schedule",
              actionHref: "/content?tag=training",
            },
            {
              title: "Campaign Goals",
              description: "Track your outreach milestones",
              actionLabel: "View goals",
              actionHref: "/dashboard#ambassador",
            },
          ],
          recommendedTags: ["ambassador", "campaign", "training"],
          contentTitle: "Advocacy resources",
          contentSubtitle: "Scripts, assets, and campaign updates",
        };
      case "volunteer":
        return {
          anchorId: "volunteer",
          highlights: {
            title: "Volunteer Briefing",
            subtitle: "Assignments, training, and support",
            items: [
              {
                title: "Active Tasks",
                value: "3",
                description: "Assignments currently in progress",
              },
              {
                title: "Next Training",
                value: "Feb 20",
                description: "Volunteer welcome session",
              },
              {
                title: "Resources",
                value: "Updated",
                description: "Orientation pack and checklists",
                actionLabel: "Open resources",
                actionHref: "/content?tag=volunteer",
              },
            ],
          },
          actionsTitle: "Volunteer Actions",
          actionsSubtitle: "Stay on track with assignments",
          actions: [
            {
              title: "Assignments",
              description: "Review current tasks and updates",
              actionLabel: "View tasks",
              actionHref: "/dashboard#volunteer",
            },
            {
              title: "Training Schedule",
              description: "Prepare for upcoming sessions",
              actionLabel: "View training",
              actionHref: "/content?tag=training",
            },
            {
              title: "Volunteer Toolkit",
              description: "Orientation pack and checklists",
              actionLabel: "Open toolkit",
              actionHref: "/content?tag=volunteer",
            },
          ],
          recommendedTags: ["volunteer", "training", "resource"],
          contentTitle: "Volunteer resources",
          contentSubtitle: "Guides and materials for your role",
        };
      case "major_donor":
        return {
          anchorId: "stewardship",
          highlights: {
            title: "Stewardship Briefing",
            subtitle: "Strategic updates and priority initiatives",
            items: [
              {
                title: "Strategic Initiatives",
                value: "3 active",
                description: "Priority expansion projects",
              },
              {
                title: "Financial Summary",
                value: "Ready",
                description: "Board-ready financial packet",
                actionLabel: "View reports",
                actionHref: "/content?type=report",
              },
              {
                title: "RDD Contact",
                value: user?.rddAssignment ?? "Partner Care",
                description: "Schedule your next update",
              },
            ],
          },
          actionsTitle: "Stewardship Actions",
          actionsSubtitle: "Plan your next strategic touchpoint",
          actions: [
            {
              title: "Executive Briefing",
              description: "Latest stewardship packet",
              actionLabel: "View packet",
              actionHref: "/content?tag=stewardship",
            },
            {
              title: "Schedule RDD Update",
              description: "Request a strategic call",
              actionLabel: "Request update",
              actionHref: "/profile",
            },
            {
              title: "Impact Milestones",
              description: "See progress on priority initiatives",
              actionLabel: "View milestones",
              actionHref: "/content?tag=impact",
            },
          ],
          recommendedTags: ["stewardship", "report", "impact", "financial"],
          contentTitle: "Strategic insights",
          contentSubtitle: "Stewardship updates curated for you",
        };
      default:
        return {
          anchorId: "partner",
          highlights: {
            title: "Partner Briefing",
            subtitle: "Your partnership highlights and next steps",
            items: [
              {
                title: "Giving Tier",
                value: tier.name,
                description: "Current partnership tier",
              },
              {
                title: "Recommended Course",
                value: accessibleCourses[0]?.title ?? "Browse courses",
                description: "Continue your learning journey",
                actionLabel: "View courses",
                actionHref: "/courses",
              },
              {
                title: "Impact Report",
                value: "Q4 2025",
                description: "Latest report ready to download",
                actionLabel: "View report",
                actionHref: "/content?type=report",
              },
            ],
          },
          actionsTitle: "Partner Actions",
          actionsSubtitle: "Make the most of your partnership",
          actions: [
            {
              title: "Give a Gift",
              description: "Support a program that matters to you",
              actionLabel: "Start a gift",
              actionHref: "/giving",
            },
            {
              title: "Explore Courses",
              description: "Deepen your understanding of Favor's work",
              actionLabel: "Browse courses",
              actionHref: "/courses",
            },
            {
              title: "Download Reports",
              description: "Latest quarterly impact summary",
              actionLabel: "Open reports",
              actionHref: "/content?type=report",
            },
          ],
          recommendedTags: ["impact", "report", "update", "partner"],
          contentTitle: "Recommended for you",
          contentSubtitle: "Updates curated for your partnership",
        };
    }
  })();

  const roleHighlights = roleExperience.highlights;
  const roleActions = roleExperience.actions;
  const roleRecommended = accessibleContent.filter((item) => {
    return roleExperience.recommendedTags.some((tag) => {
      return item.tags.includes(tag) || item.type === tag;
    });
  });
  const curatedContent = (roleRecommended.length > 0 ? roleRecommended : baseRecommended).slice(0, 3);
  const moduleTiles = MODULE_TILES.filter(
    (tile) => tile.audiences === "all" || tile.audiences.includes(userType)
  );

  const getCourseProgress = (courseId: string) => {
    const courseModules = accessibleModules.filter((m) => m.courseId === courseId);
    const courseProgress = progress.filter((p) =>
      courseModules.some((m) => m.id === p.moduleId)
    );
    return { courseModules, courseProgress };
  };

  const inProgressCourses = accessibleCourses
    .map((course) => {
      const { courseModules, courseProgress } = getCourseProgress(course.id);
      const completedCount = courseProgress.filter((p) => p.completed).length;
      return {
        course,
        completedCount,
        totalCount: courseModules.length,
      };
    })
    .filter((entry) => entry.completedCount > 0)
    .sort((a, b) => b.completedCount - a.completedCount)
    .slice(0, 3);
  const courseCards =
    inProgressCourses.length > 0
      ? inProgressCourses
      : accessibleCourses.slice(0, 3).map((course) => {
          const { courseModules, courseProgress } = getCourseProgress(course.id);
          const completedCount = courseProgress.filter((p) => p.completed).length;
          return {
            course,
            completedCount,
            totalCount: courseModules.length,
          };
        });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-[#666666]">Loading your portal...</div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* HERO WELCOME BAND */}
      <section className="glass-enter relative overflow-hidden rounded-3xl bg-[#2b4d24]/90 backdrop-blur-xl border border-white/10 px-6 py-10 sm:px-10 sm:py-12">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/5" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#c5ccc2]">
              {tier.name}
            </p>
            <h1 className="mt-2 font-serif text-3xl font-semibold text-white sm:text-4xl">
              Welcome back, {user?.firstName}
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/70">
              Thank you for your partnership with Favor International.
              Together we are transforming hearts and nations.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <GiveNowDialog
              onGiftComplete={() => setRefreshKey((k) => k + 1)}
              trigger={
                <Button className="bg-white text-[#2b4d24] hover:bg-white/90">
                  <Heart className="mr-2 h-4 w-4" />
                  Give Now
                </Button>
              }
            />
            <Button
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
              asChild
            >
              <Link href="/courses">
                <GraduationCap className="mr-2 h-4 w-4" />
                Courses
              </Link>
            </Button>
          </div>
        </div>

        {/* Stat pills */}
        <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
          {[
            {
              label: "Lifetime Giving",
              value: formatCurrency(totalGiven),
              icon: Heart,
            },
            {
              label: `${new Date().getFullYear()} Year to Date`,
              value: formatCurrency(ytdGiven),
              icon: Calendar,
            },
            {
              label: "Course Progress",
              value: `${progressPercentage}%`,
              icon: GraduationCap,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 rounded-xl glass-hero px-4 py-3"
            >
              <stat.icon className="h-4 w-4 text-white/60" />
              <div>
                <p className="text-xs text-white/60">{stat.label}</p>
                <p className="text-lg font-semibold text-white">
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* LATEST FROM FAVOR (Carousel) */}
      <section className="glass-enter glass-enter-delay-1">
        <SectionHeader title={roleHighlights.title} subtitle={roleHighlights.subtitle} />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roleHighlights.items.map((item) => (
            <Card key={item.title} className="glass-pane">
              <CardContent className="p-5 space-y-2">
                <p className="text-xs text-[#999999]">{item.title}</p>
                <p className="text-xl font-semibold text-[#1a1a1a]">{item.value}</p>
                <p className="text-sm text-[#666666]">{item.description}</p>
                {item.actionLabel && item.actionHref && (
                  <Button variant="ghost" size="sm" className="text-[#2b4d24]" asChild>
                    <Link href={item.actionHref}>
                      {item.actionLabel} <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section
        id={roleExperience.anchorId}
        className="glass-enter glass-enter-delay-2 scroll-mt-24"
      >
        <SectionHeader
          title={roleExperience.actionsTitle}
          subtitle={roleExperience.actionsSubtitle}
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roleActions.map((item) => (
            <Card key={item.title} className="glass-pane">
              <CardContent className="p-5 space-y-3">
                <div>
                  <p className="text-xs text-[#999999]">{item.title}</p>
                  <p className="mt-2 text-sm text-[#666666]">{item.description}</p>
                </div>
                <Button variant="ghost" size="sm" className="text-[#2b4d24]" asChild>
                  <Link href={item.actionHref}>
                    {item.actionLabel} <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {curatedContent.length > 0 && (
        <section className="glass-enter glass-enter-delay-3">
          <SectionHeader
            title={roleExperience.contentTitle}
            subtitle={roleExperience.contentSubtitle}
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {curatedContent.map((item) => (
              <Link key={item.id} href={`/content/${item.id}`} className="block">
                <Card className="glass-pane glass-transition glass-hover">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] text-[#8b957b]">
                        {item.type}
                      </Badge>
                      <span className="text-xs text-[#999999]">
                        {new Date(item.date).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-serif text-lg text-[#1a1a1a]">{item.title}</h3>
                    <p className="text-sm text-[#666666] line-clamp-2">{item.excerpt}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="glass-enter glass-enter-delay-4">
        <SectionHeader title="Latest from Favor" subtitle="News, stories, and resources" />
        <div className="mt-5">
          <NewsCarousel items={NEWS_FEED} />
        </div>
      </section>

      {/* MODULES GRID */}
      <section className="glass-enter glass-enter-delay-5">
        <SectionHeader title="Your Portal" subtitle="Explore your partnership tools and resources" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {moduleTiles.map((tile) =>
            tile.id === "support" ? (
              <ContactSupportDialog
                key={tile.id}
                trigger={
                  <ModuleTile
                    title={tile.title}
                    description={tile.description}
                    icon={tile.icon}
                    href="#"
                    accent={tile.accent}
                    onClick={() => {}}
                  />
                }
              />
            ) : (
              <ModuleTile
                key={tile.id}
                title={tile.title}
                description={tile.description}
                icon={tile.icon}
                href={tile.href}
                accent={tile.accent}
                badge={
                  tile.id === "courses" && progressPercentage > 0
                    ? `${progressPercentage}%`
                    : tile.id === "giving" && gifts.length > 0
                      ? `${gifts.length} gifts`
                      : undefined
                }
              />
            )
          )}
        </div>
      </section>

      {/* CONTINUE WHERE YOU LEFT OFF */}
      <section className="glass-enter glass-enter-delay-6">
        <SectionHeader
          title="Continue Where You Left Off"
          subtitle="Pick up your learning progress"
          href="/courses"
        />
        <div className="mt-5">
          {courseCards.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courseCards.map(({ course, completedCount, totalCount }) => {
                const total = totalCount || 1;
                const pct = Math.round((completedCount / total) * 100);

                return (
                  <Link
                    key={course.id}
                    href={`/courses/${course.id}`}
                    className="group block"
                  >
                    <Card className="overflow-hidden glass-pane glass-transition glass-hover border-0">
                      <div className="relative aspect-[16/9] bg-gradient-to-br from-[#2b4d24]/15 to-[#8b957b]/10">
                        {course.thumbnailUrl ? (
                          <Image
                            src={course.thumbnailUrl}
                            alt={course.title}
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <BookOpen className="h-10 w-10 text-[#c5ccc2]" />
                          </div>
                        )}
                        <Badge className="absolute right-2 top-2 bg-[#2b4d24] text-[#FFFEF9] text-[10px]">
                          {pct}% complete
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <h4 className="font-serif text-base font-semibold text-[#1a1a1a] line-clamp-1 group-hover:text-[#2b4d24] transition-colors">
                          {course.title}
                        </h4>
                        <div className="mt-2">
                          <Progress value={pct} className="h-1.5" />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-[#999999]">
                          <span>
                            {completedCount}/{total} modules
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />~{total * 15} min
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={GraduationCap}
              title="No courses started yet"
              description="Browse our partner learning library to get started with your first course."
              actionLabel="Browse Courses"
              actionHref="/courses"
            />
          )}
        </div>
      </section>

      {/* RECENT ACTIVITY */}
      <section className="glass-enter glass-enter-delay-7">
        <SectionHeader title="Recent Activity" subtitle="Your latest gifts and updates" />
        <div className="mt-5 space-y-3">
          {gifts.length > 0 ? (
            gifts.slice(0, 5).map((gift) => (
              <div
                key={gift.id}
                className="flex items-center justify-between rounded-xl glass-pane px-5 py-4 glass-transition glass-hover"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2b4d24]/5">
                    <Heart className="h-4 w-4 text-[#2b4d24]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1a1a1a]">
                      ${gift.amount.toLocaleString()} - {gift.designation}
                    </p>
                    <p className="text-xs text-[#999999]">
                      {new Date(gift.date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <Badge variant={gift.isRecurring ? "default" : "secondary"}>
                  {gift.isRecurring ? "Recurring" : "One-time"}
                </Badge>
              </div>
            ))
          ) : (
            <EmptyState
              icon={Heart}
              title="No gifts yet"
              description="When you make a gift, it will appear here."
              actionLabel="Make a Gift"
              onAction={() => {}}
            />
          )}
          {gifts.length > 5 && (
            <div className="text-center">
              <Button variant="ghost" className="text-[#2b4d24]" asChild>
                <Link href="/giving/history">
                  View all giving history
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
