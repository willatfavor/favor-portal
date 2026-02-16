"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Target,
  Plus,
  Trophy,
  TrendingUp,
  Calendar,
  Trash2,
  Edit3,
  CheckCircle,
} from "lucide-react";
import { SectionHeader } from "@/components/portal/section-header";
import { EmptyState } from "@/components/portal/empty-state";
import { PageBreadcrumb, PageBackButton } from "@/components/giving/page-navigation";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface GivingGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category: "annual" | "project" | "monthly" | "custom";
  description?: string;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<GivingGoal[]>([
    {
      id: "goal-1",
      name: "2026 Annual Giving",
      targetAmount: 5000,
      currentAmount: 2400,
      deadline: "2026-12-31",
      category: "annual",
      description: "My commitment for the year",
    },
  ]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GivingGoal | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [formDeadline, setFormDeadline] = useState("");
  const [formCategory, setFormCategory] = useState<GivingGoal["category"]>("custom");
  const [formDescription, setFormDescription] = useState("");

  function resetForm() {
    setFormName("");
    setFormTarget("");
    setFormDeadline("");
    setFormCategory("custom");
    setFormDescription("");
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const targetAmount = parseFloat(formTarget);
    if (!formName || targetAmount <= 0 || !formDeadline) {
      toast.error("Please fill in all required fields");
      return;
    }

    const newGoal: GivingGoal = {
      id: `goal-${Date.now()}`,
      name: formName,
      targetAmount,
      currentAmount: 0,
      deadline: formDeadline,
      category: formCategory,
      description: formDescription || undefined,
    };

    setGoals([...goals, newGoal]);
    toast.success("Goal created!");
    setIsCreateOpen(false);
    resetForm();
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingGoal) return;

    const targetAmount = parseFloat(formTarget) || editingGoal.targetAmount;

    setGoals(
      goals.map((g) =>
        g.id === editingGoal.id
          ? {
              ...g,
              name: formName || g.name,
              targetAmount,
              deadline: formDeadline || g.deadline,
              category: formCategory,
              description: formDescription || g.description,
            }
          : g
      )
    );

    toast.success("Goal updated!");
    setEditingGoal(null);
    resetForm();
  }

  function handleDelete() {
    if (!deletingGoalId) return;
    setGoals(goals.filter((g) => g.id !== deletingGoalId));
    toast.success("Goal deleted");
    setDeletingGoalId(null);
  }

  function openEdit(goal: GivingGoal) {
    setEditingGoal(goal);
    setFormName(goal.name);
    setFormTarget(goal.targetAmount.toString());
    setFormDeadline(goal.deadline);
    setFormCategory(goal.category);
    setFormDescription(goal.description || "");
  }

  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalCurrent = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const completedGoals = goals.filter((g) => g.currentAmount >= g.targetAmount).length;
  const activeGoals = goals.filter((g) => g.currentAmount < g.targetAmount).length;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <PageBackButton href="/giving" label="Back to Giving" />
          <PageBreadcrumb items={[
            { label: "Giving", href: "/giving" },
            { label: "Goals" }
          ]} />
          <h1 className="font-serif text-3xl font-semibold text-[#1a1a1a]">Giving Goals</h1>
          <p className="mt-1 text-sm text-[#666666]">Set targets and track your giving commitments.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-[#2b4d24] hover:bg-[#1a3a15]">
          <Plus className="mr-2 h-4 w-4" />
          New Goal
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2b4d24]/5">
              <Target className="h-5 w-5 text-[#2b4d24]" />
            </div>
            <div>
              <p className="text-xs text-[#999999]">Active Goals</p>
              <p className="text-xl font-semibold text-[#1a1a1a]">{activeGoals}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2b4d24]/5">
              <Trophy className="h-5 w-5 text-[#2b4d24]" />
            </div>
            <div>
              <p className="text-xs text-[#999999]">Completed</p>
              <p className="text-xl font-semibold text-[#1a1a1a]">{completedGoals}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2b4d24]/5">
              <TrendingUp className="h-5 w-5 text-[#2b4d24]" />
            </div>
            <div>
              <p className="text-xs text-[#999999]">Total Target</p>
              <p className="text-xl font-semibold text-[#1a1a1a]">{formatCurrency(totalTarget)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2b4d24]/5">
              <CheckCircle className="h-5 w-5 text-[#2b4d24]" />
            </div>
            <div>
              <p className="text-xs text-[#999999]">Progress</p>
              <p className="text-xl font-semibold text-[#1a1a1a]">
                {totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goals List */}
      <section>
        <SectionHeader title="Your Goals" />
        {goals.length > 0 ? (
          <div className="mt-4 grid gap-4">
            {goals.map((goal) => {
              const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
              const isComplete = goal.currentAmount >= goal.targetAmount;
              const daysLeft = Math.ceil(
                (new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              );

              return (
                <Card key={goal.id} className={`glass-pane ${isComplete ? "border-green-200" : ""}`}>
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-start gap-4">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-full ${
                            isComplete ? "bg-green-100" : "bg-[#2b4d24]/10"
                          }`}
                        >
                          {isComplete ? (
                            <Trophy className="h-5 w-5 text-green-600" />
                          ) : (
                            <Target className="h-5 w-5 text-[#2b4d24]" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-[#1a1a1a]">{goal.name}</p>
                            {isComplete && (
                              <Badge className="bg-green-100 text-green-700">Completed</Badge>
                            )}
                          </div>
                          {goal.description && (
                            <p className="text-sm text-[#666666]">{goal.description}</p>
                          )}
                          <div className="mt-2 flex items-center gap-4 text-xs text-[#999999]">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {daysLeft > 0 ? `${daysLeft} days left` : "Overdue"}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {goal.category}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 lg:max-w-md">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-[#1a1a1a]">
                            {formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}
                          </span>
                          <span className={`text-sm font-medium ${isComplete ? "text-green-600" : "text-[#2b4d24]"}`}>
                            {Math.round(progress)}%
                          </span>
                        </div>
                        <Progress value={progress} className={`h-2 ${isComplete ? "bg-green-100" : ""}`} />
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(goal)}>
                          <Edit3 className="mr-1 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => setDeletingGoalId(goal.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Target}
            title="No goals yet"
            description="Set giving goals to stay motivated and track your progress."
            actionLabel="Create Your First Goal"
            onAction={() => setIsCreateOpen(true)}
          />
        )}
      </section>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Create Giving Goal</DialogTitle>
            <DialogDescription>Set a target and deadline for your giving.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Goal Name *</Label>
              <Input
                placeholder="e.g., 2026 Annual Giving"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Target Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]">$</span>
                <Input
                  type="number"
                  min={1}
                  placeholder="0"
                  className="pl-7"
                  value={formTarget}
                  onChange={(e) => setFormTarget(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formCategory} onValueChange={(v) => setFormCategory(v as GivingGoal["category"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Deadline *</Label>
              <Input
                type="date"
                value={formDeadline}
                onChange={(e) => setFormDeadline(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Input
                placeholder="What's this goal for?"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#2b4d24] hover:bg-[#1a3a15]">Create Goal</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingGoal} onOpenChange={() => setEditingGoal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Edit Goal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>Goal Name</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Target Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]">$</span>
                <Input
                  type="number"
                  className="pl-7"
                  value={formTarget}
                  onChange={(e) => setFormTarget(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formCategory} onValueChange={(v) => setFormCategory(v as GivingGoal["category"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Deadline</Label>
              <Input type="date" value={formDeadline} onChange={(e) => setFormDeadline(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingGoal(null)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#2b4d24] hover:bg-[#1a3a15]">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deletingGoalId} onOpenChange={() => setDeletingGoalId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Goal?</DialogTitle>
            <DialogDescription>
              This will permanently remove this goal. Your giving history will not be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingGoalId(null)}>Keep Goal</Button>
            <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
