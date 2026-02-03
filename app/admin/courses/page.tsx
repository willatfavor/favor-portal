"use client";

import { useEffect, useMemo, useState } from "react";
import { Course, CourseModule } from "@/types";
import { getMockCourses, getMockModules, setMockCourses, setMockModules } from "@/lib/mock-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { GraduationCap, PlusCircle } from "lucide-react";

const ACCESS_LEVELS: Course["accessLevel"][] = [
  "partner",
  "major_donor",
  "church",
  "foundation",
  "ambassador",
];

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [newCourse, setNewCourse] = useState<Partial<Course>>({
    title: "",
    description: "",
    accessLevel: "partner",
  });
  const [moduleDraft, setModuleDraft] = useState<Record<string, Partial<CourseModule>>>({});

  useEffect(() => {
    setCourses(getMockCourses());
    setModules(getMockModules());
  }, []);

  const modulesByCourse = useMemo(() => {
    return modules.reduce<Record<string, CourseModule[]>>((acc, module) => {
      acc[module.courseId] = acc[module.courseId] || [];
      acc[module.courseId].push(module);
      return acc;
    }, {});
  }, [modules]);

  function saveCourse() {
    if (!newCourse.title || !newCourse.description) return;
    const course: Course = {
      id: `course-${Date.now()}`,
      title: newCourse.title,
      description: newCourse.description,
      accessLevel: newCourse.accessLevel ?? "partner",
      sortOrder: courses.length + 1,
      createdAt: new Date().toISOString(),
      moduleCount: 0,
    };
    const next = [course, ...courses];
    setCourses(next);
    setMockCourses(next);
    setNewCourse({ title: "", description: "", accessLevel: "partner" });
  }

  function addModule(courseId: string) {
    const draft = moduleDraft[courseId];
    if (!draft?.title) return;
    const existing = modulesByCourse[courseId] || [];
    const module: CourseModule = {
      id: `${courseId}-module-${Date.now()}`,
      courseId,
      title: draft.title,
      description: draft.description || "",
      cloudflareVideoId: draft.cloudflareVideoId || "demo",
      sortOrder: existing.length + 1,
      durationSeconds: draft.durationSeconds || 600,
    };
    const next = [module, ...modules];
    setModules(next);
    setMockModules(next);
    setModuleDraft({ ...moduleDraft, [courseId]: { title: "", description: "", durationSeconds: 600 } });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-[#1a1a1a]">LMS Management</h1>
          <p className="text-sm text-[#666666]">Create courses and manage module content.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-[#2b4d24] hover:bg-[#1a3a15]">
              <PlusCircle className="mr-2 h-4 w-4" /> New Course
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg glass-elevated border-0">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">Create Course</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={newCourse.title ?? ""}
                  onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={newCourse.description ?? ""}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Access Level</Label>
                <Select
                  value={newCourse.accessLevel}
                  onValueChange={(value) => setNewCourse({ ...newCourse, accessLevel: value as Course["accessLevel"] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Access Level" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCESS_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full bg-[#2b4d24] hover:bg-[#1a3a15]" onClick={saveCourse}>
                Save Course
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {courses.map((course) => {
          const courseModules = modulesByCourse[course.id] || [];
          return (
            <Card key={course.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="font-serif text-xl">{course.title}</CardTitle>
                    <p className="text-sm text-[#666666]">{course.description}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-[#8b957b]">
                    {course.accessLevel.replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-[#999999]">
                  <GraduationCap className="h-4 w-4 text-[#2b4d24]" />
                  {courseModules.length} modules
                </div>
                <div className="space-y-3">
                  {courseModules.map((module) => (
                    <div key={module.id} className="rounded-xl glass-inset p-3">
                      <p className="text-sm font-medium text-[#1a1a1a]">{module.title}</p>
                      <p className="text-xs text-[#999999]">{module.description}</p>
                    </div>
                  ))}
                  {courseModules.length === 0 && (
                    <p className="text-xs text-[#999999]">No modules yet.</p>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
                  <div className="space-y-2">
                    <Label>Add Module Title</Label>
                    <Input
                      value={moduleDraft[course.id]?.title ?? ""}
                      onChange={(e) =>
                        setModuleDraft({
                          ...moduleDraft,
                          [course.id]: { ...moduleDraft[course.id], title: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (sec)</Label>
                    <Input
                      type="number"
                      value={moduleDraft[course.id]?.durationSeconds ?? 600}
                      onChange={(e) =>
                        setModuleDraft({
                          ...moduleDraft,
                          [course.id]: {
                            ...moduleDraft[course.id],
                            durationSeconds: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                </div>
                <Button variant="outline" onClick={() => addModule(course.id)}>
                  Add Module
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
