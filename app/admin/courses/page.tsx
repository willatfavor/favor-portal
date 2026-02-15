"use client";

import { useEffect, useMemo, useState } from "react";
import { Course, CourseModule } from "@/types";
import { getMockCourses, getMockModules, setMockCourses, setMockModules } from "@/lib/mock-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { GraduationCap, PlusCircle, Pencil, Film, FileText } from "lucide-react";

const ACCESS_LEVELS: Course["accessLevel"][] = [
  "partner",
  "major_donor",
  "church",
  "foundation",
  "ambassador",
];
const STATUS: Array<NonNullable<Course["status"]>> = ["draft", "published"];
const MODULE_TYPES: NonNullable<CourseModule["type"]>[] = ["video", "reading", "quiz"];

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newCourse, setNewCourse] = useState<Partial<Course>>({
    title: "",
    description: "",
    accessLevel: "partner",
    status: "draft",
    isLocked: false,
    isPaid: false,
    price: 0,
    tags: [],
    coverImage: "",
  });
  const [moduleDraft, setModuleDraft] = useState<Record<string, Partial<CourseModule>>>({});
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);

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
      status: newCourse.status ?? "draft",
      isLocked: newCourse.isLocked ?? false,
      isPaid: newCourse.isPaid ?? false,
      price: newCourse.isPaid ? newCourse.price ?? 0 : 0,
      tags: newCourse.tags ?? [],
      coverImage: newCourse.coverImage ?? "",
    };
    const next = [course, ...courses];
    setCourses(next);
    setMockCourses(next);
    setNewCourse({
      title: "",
      description: "",
      accessLevel: "partner",
      status: "draft",
      isLocked: false,
      isPaid: false,
      price: 0,
      tags: [],
      coverImage: "",
    });
  }

  function updateCourse() {
    if (!editingCourse) return;
    const next = courses.map((course) =>
      course.id === editingCourse.id ? editingCourse : course
    );
    setCourses(next);
    setMockCourses(next);
    setEditingCourse(null);
  }

  function addModule(courseId: string) {
    const draft = moduleDraft[courseId];
    if (!draft?.title) return;
    const existing = modulesByCourse[courseId] || [];
    const newModule: CourseModule = {
      id: `${courseId}-module-${Date.now()}`,
      courseId,
      title: draft.title,
      description: draft.description || "",
      cloudflareVideoId: draft.cloudflareVideoId || "demo",
      sortOrder: existing.length + 1,
      durationSeconds: draft.durationSeconds || 600,
      type: draft.type ?? "video",
      resourceUrl: draft.resourceUrl,
      notes: draft.notes,
    };
    const next = [newModule, ...modules];
    setModules(next);
    setMockModules(next);
    setModuleDraft({
      ...moduleDraft,
      [courseId]: { title: "", description: "", durationSeconds: 600, type: "video" },
    });
  }

  function updateModule() {
    if (!editingModule) return;
    const next = modules.map((module) =>
      module.id === editingModule.id ? editingModule : module
    );
    setModules(next);
    setMockModules(next);
    setEditingModule(null);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-[#1a1a1a]">LMS Management</h1>
          <p className="text-sm text-[#666666]">
            Create courses, manage modules, and configure access rules.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#2b4d24] hover:bg-[#1a3a15]">
              <PlusCircle className="mr-2 h-4 w-4" /> New Course
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl glass-elevated border-0">
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
                <Textarea
                  value={newCourse.description ?? ""}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Access Level</Label>
                  <Select
                    value={newCourse.accessLevel}
                    onValueChange={(value) =>
                      setNewCourse({ ...newCourse, accessLevel: value as Course["accessLevel"] })
                    }
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
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={newCourse.status}
                    onValueChange={(value) =>
                      setNewCourse({ ...newCourse, status: value as Course["status"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Cover Image URL</Label>
                  <Input
                    value={newCourse.coverImage ?? ""}
                    onChange={(e) => setNewCourse({ ...newCourse, coverImage: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tags (comma separated)</Label>
                  <Input
                    value={(newCourse.tags ?? []).join(", ")}
                    onChange={(e) =>
                      setNewCourse({ ...newCourse, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })
                    }
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 rounded-xl glass-inset p-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newCourse.isLocked ?? false}
                    onCheckedChange={(checked) => setNewCourse({ ...newCourse, isLocked: checked })}
                  />
                  <span className="text-sm text-[#666666]">Locked course</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newCourse.isPaid ?? false}
                    onCheckedChange={(checked) => setNewCourse({ ...newCourse, isPaid: checked })}
                  />
                  <span className="text-sm text-[#666666]">Paid course</span>
                </div>
                {newCourse.isPaid && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-[#999999]">Price</Label>
                    <Input
                      type="number"
                      className="w-28"
                      value={newCourse.price ?? 0}
                      onChange={(e) => setNewCourse({ ...newCourse, price: Number(e.target.value) })}
                    />
                  </div>
                )}
              </div>
              <Button
                className="w-full bg-[#2b4d24] hover:bg-[#1a3a15]"
                onClick={() => {
                  saveCourse();
                  setCreateOpen(false);
                }}
              >
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
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="font-serif text-xl">{course.title}</CardTitle>
                    <p className="text-sm text-[#666666]">{course.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-[10px] text-[#8b957b]">
                      {course.accessLevel.replace("_", " ")}
                    </Badge>
                    {course.status && (
                      <Badge variant="secondary" className="text-[10px]">
                        {course.status}
                      </Badge>
                    )}
                    {course.isLocked && (
                      <Badge className="text-[10px] bg-[#2b4d24]/10 text-[#2b4d24]">Locked</Badge>
                    )}
                    {course.isPaid && (
                      <Badge className="text-[10px] bg-[#e1a730]/10 text-[#a36d4c]">
                        Paid - ${course.price ?? 0}
                      </Badge>
                    )}
                  </div>
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
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-[#1a1a1a]">{module.title}</p>
                          <p className="text-xs text-[#999999]">{module.description}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingModule(module)}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-[#8b957b]">
                        <Badge variant="outline" className="text-[10px]">
                          {(module.type ?? "video").toUpperCase()}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {Math.round(module.durationSeconds / 60)} min
                        </Badge>
                        {module.resourceUrl && (
                          <Badge variant="secondary" className="text-[10px]">
                            Resource linked
                          </Badge>
                        )}
                      </div>
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
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Module Type</Label>
                    <Select
                      value={moduleDraft[course.id]?.type ?? "video"}
                      onValueChange={(value) =>
                        setModuleDraft({
                          ...moduleDraft,
                          [course.id]: { ...moduleDraft[course.id], type: value as CourseModule["type"] },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {MODULE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Video/Asset URL</Label>
                    <Input
                      value={moduleDraft[course.id]?.resourceUrl ?? ""}
                      onChange={(e) =>
                        setModuleDraft({
                          ...moduleDraft,
                          [course.id]: { ...moduleDraft[course.id], resourceUrl: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Module Notes (optional)</Label>
                  <Textarea
                    value={moduleDraft[course.id]?.notes ?? ""}
                    onChange={(e) =>
                      setModuleDraft({
                        ...moduleDraft,
                        [course.id]: { ...moduleDraft[course.id], notes: e.target.value },
                      })
                    }
                  />
                </div>
                <Button variant="outline" onClick={() => addModule(course.id)}>
                  Add Module
                </Button>
                <Button
                  variant="ghost"
                  className="text-[#2b4d24]"
                  onClick={() => setEditingCourse(course)}
                >
                  <Pencil className="mr-2 h-4 w-4" /> Edit course settings
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={Boolean(editingCourse)} onOpenChange={(open) => !open && setEditingCourse(null)}>
        <DialogContent className="max-w-xl glass-elevated border-0">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Edit Course</DialogTitle>
          </DialogHeader>
          {editingCourse && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editingCourse.title}
                  onChange={(e) => setEditingCourse({ ...editingCourse, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingCourse.description}
                  onChange={(e) => setEditingCourse({ ...editingCourse, description: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editingCourse.status ?? "draft"}
                    onValueChange={(value) => setEditingCourse({ ...editingCourse, status: value as Course["status"] })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Access Level</Label>
                  <Select
                    value={editingCourse.accessLevel}
                    onValueChange={(value) =>
                      setEditingCourse({ ...editingCourse, accessLevel: value as Course["accessLevel"] })
                    }
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
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Cover Image</Label>
                  <Input
                    value={editingCourse.coverImage ?? ""}
                    onChange={(e) => setEditingCourse({ ...editingCourse, coverImage: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <Input
                    value={(editingCourse.tags ?? []).join(", ")}
                    onChange={(e) =>
                      setEditingCourse({
                        ...editingCourse,
                        tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 rounded-xl glass-inset p-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingCourse.isLocked ?? false}
                    onCheckedChange={(checked) => setEditingCourse({ ...editingCourse, isLocked: checked })}
                  />
                  <span className="text-sm text-[#666666]">Locked course</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingCourse.isPaid ?? false}
                    onCheckedChange={(checked) => setEditingCourse({ ...editingCourse, isPaid: checked })}
                  />
                  <span className="text-sm text-[#666666]">Paid course</span>
                </div>
                {editingCourse.isPaid && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-[#999999]">Price</Label>
                    <Input
                      type="number"
                      className="w-28"
                      value={editingCourse.price ?? 0}
                      onChange={(e) => setEditingCourse({ ...editingCourse, price: Number(e.target.value) })}
                    />
                  </div>
                )}
              </div>
              <Button className="w-full bg-[#2b4d24] hover:bg-[#1a3a15]" onClick={updateCourse}>
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingModule)} onOpenChange={(open) => !open && setEditingModule(null)}>
        <DialogContent className="max-w-lg glass-elevated border-0">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Edit Module</DialogTitle>
          </DialogHeader>
          {editingModule && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editingModule.title}
                  onChange={(e) => setEditingModule({ ...editingModule, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingModule.description ?? ""}
                  onChange={(e) => setEditingModule({ ...editingModule, description: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={editingModule.type ?? "video"}
                    onValueChange={(value) =>
                      setEditingModule({ ...editingModule, type: value as CourseModule["type"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {MODULE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Duration (sec)</Label>
                  <Input
                    type="number"
                    value={editingModule.durationSeconds}
                    onChange={(e) =>
                      setEditingModule({ ...editingModule, durationSeconds: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Video / Asset URL</Label>
                <Input
                  value={editingModule.resourceUrl ?? ""}
                  onChange={(e) =>
                    setEditingModule({ ...editingModule, resourceUrl: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Module Notes</Label>
                <Textarea
                  value={editingModule.notes ?? ""}
                  onChange={(e) =>
                    setEditingModule({ ...editingModule, notes: e.target.value })
                  }
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-[#999999]">
                <Film className="h-3.5 w-3.5" /> Video modules can point to Cloudflare Stream IDs.
              </div>
              <div className="flex items-center gap-2 text-xs text-[#999999]">
                <FileText className="h-3.5 w-3.5" /> Reading modules can link PDFs or docs.
              </div>
              <Button className="w-full bg-[#2b4d24] hover:bg-[#1a3a15]" onClick={updateModule}>
                Save Module
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
