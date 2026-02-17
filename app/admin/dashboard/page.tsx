"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ConstituentType } from "@/types";
import { buildRoleExperience } from "@/lib/dashboard/role-experience";
import {
  applyRoleExperienceOverride,
  compactDashboardRoleOverride,
  DASHBOARD_ROLE_KEYS,
  type DashboardRoleExperienceOverride,
  type RoleExperienceItemOverride,
  sanitizeDashboardRoleOverrides,
} from "@/lib/dashboard/experience-overrides";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, RotateCcw } from "lucide-react";

const ROLE_LABELS: Record<ConstituentType, string> = {
  individual: "Individual",
  major_donor: "Major Donor",
  church: "Church",
  foundation: "Foundation",
  daf: "DAF",
  ambassador: "Ambassador",
  volunteer: "Volunteer",
};

function buildPreviewExperience(roleKey: ConstituentType) {
  return buildRoleExperience({
    userType: roleKey,
    gifts: [],
    grants: [],
    tierName: "Partner",
    recommendedCourseTitle: "Browse courses",
    rddAssignment: "Partner Care",
  });
}

export default function AdminDashboardExperiencePage() {
  const [selectedRole, setSelectedRole] = useState<ConstituentType>("major_donor");
  const [overrides, setOverrides] = useState<DashboardRoleExperienceOverride[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadOverrides = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/dashboard/experience", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed");
      const payload = await response.json();
      setOverrides(sanitizeDashboardRoleOverrides(payload.overrides));
    } catch {
      toast.error("Unable to load dashboard experience settings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverrides();
  }, [loadOverrides]);

  const baseExperience = useMemo(() => buildPreviewExperience(selectedRole), [selectedRole]);
  const currentOverride = useMemo<DashboardRoleExperienceOverride>(() => {
    return (
      overrides.find((entry) => entry.roleKey === selectedRole) ?? {
        roleKey: selectedRole,
        highlights: [],
        actions: [],
      }
    );
  }, [overrides, selectedRole]);

  const previewExperience = useMemo(
    () => applyRoleExperienceOverride(baseExperience, currentOverride),
    [baseExperience, currentOverride]
  );

  function updateOverrideItem(
    section: "highlights" | "actions",
    index: number,
    updater: (item: RoleExperienceItemOverride) => RoleExperienceItemOverride
  ) {
    setOverrides((current) => {
      const existing = current.find((entry) => entry.roleKey === selectedRole) ?? {
        roleKey: selectedRole,
        highlights: [],
        actions: [],
      };

      const nextItems = [...existing[section]];
      while (nextItems.length <= index) {
        nextItems.push({});
      }
      nextItems[index] = updater(nextItems[index] ?? {});

      const nextEntry: DashboardRoleExperienceOverride = {
        ...existing,
        [section]: nextItems,
      };

      return current.some((entry) => entry.roleKey === selectedRole)
        ? current.map((entry) => (entry.roleKey === selectedRole ? nextEntry : entry))
        : [...current, nextEntry];
    });
  }

  async function saveSelectedRole() {
    try {
      setIsSaving(true);
      const payload = compactDashboardRoleOverride({
        ...currentOverride,
        roleKey: selectedRole,
      });

      const response = await fetch("/api/admin/dashboard/experience", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed");

      await loadOverrides();
      toast.success("Dashboard experience updated");
    } catch {
      toast.error("Unable to save dashboard experience");
    } finally {
      setIsSaving(false);
    }
  }

  async function resetSelectedRole() {
    try {
      setIsSaving(true);
      const response = await fetch("/api/admin/dashboard/experience", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleKey: selectedRole }),
      });
      if (!response.ok) throw new Error("Failed");

      await loadOverrides();
      toast.success("Role overrides reset to defaults");
    } catch {
      toast.error("Unable to reset role overrides");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-[#1a1a1a]">Dashboard Experience</h1>
          <p className="text-sm text-[#666666]">
            Configure role-specific dashboard highlights and action links without code changes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={selectedRole}
            onValueChange={(value) => setSelectedRole(value as ConstituentType)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {DASHBOARD_ROLE_KEYS.map((role) => (
                <SelectItem key={role} value={role}>
                  {ROLE_LABELS[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => void resetSelectedRole()} disabled={isSaving || isLoading}>
            <RotateCcw className="mr-2 h-4 w-4" /> Reset Role
          </Button>
          <Button
            className="bg-[#2b4d24] hover:bg-[#1a3a15]"
            onClick={() => void saveSelectedRole()}
            disabled={isSaving || isLoading}
          >
            <Save className="mr-2 h-4 w-4" /> {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-[#666666]">Loading experience settings...</CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="highlights" className="space-y-5">
          <TabsList>
            <TabsTrigger value="highlights">Highlights</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="highlights" className="space-y-4">
            {baseExperience.highlights.items.map((item, index) => {
              const override = currentOverride.highlights[index] ?? {};
              return (
                <Card key={`${selectedRole}-highlight-${index}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-serif text-lg">Highlight #{index + 1}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-[#c5ccc2]/40 bg-[#faf9f6] px-3 py-2">
                      <p className="text-xs text-[#666666]">Default: {item.title}</p>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`highlight-hidden-${index}`} className="text-xs text-[#666666]">
                          Hidden
                        </Label>
                        <Switch
                          id={`highlight-hidden-${index}`}
                          checked={Boolean(override.hidden)}
                          onCheckedChange={(checked) =>
                            updateOverrideItem("highlights", index, (current) => ({
                              ...current,
                              hidden: checked,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Title Override</Label>
                        <Input
                          value={override.title ?? ""}
                          placeholder={item.title}
                          onChange={(event) =>
                            updateOverrideItem("highlights", index, (current) => ({
                              ...current,
                              title: event.target.value || undefined,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Value Override</Label>
                        <Input
                          value={override.value ?? ""}
                          placeholder={item.value}
                          onChange={(event) =>
                            updateOverrideItem("highlights", index, (current) => ({
                              ...current,
                              value: event.target.value || undefined,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Description Override</Label>
                      <Textarea
                        rows={2}
                        value={override.description ?? ""}
                        placeholder={item.description}
                        onChange={(event) =>
                          updateOverrideItem("highlights", index, (current) => ({
                            ...current,
                            description: event.target.value || undefined,
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Action Label Override</Label>
                        <Input
                          value={override.actionLabel ?? ""}
                          placeholder={item.actionLabel ?? "No default action label"}
                          onChange={(event) =>
                            updateOverrideItem("highlights", index, (current) => ({
                              ...current,
                              actionLabel: event.target.value || undefined,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Action Link Override</Label>
                        <Input
                          value={override.actionHref ?? ""}
                          placeholder={item.actionHref ?? "No default action link"}
                          onChange={(event) =>
                            updateOverrideItem("highlights", index, (current) => ({
                              ...current,
                              actionHref: event.target.value || undefined,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            {baseExperience.actions.map((item, index) => {
              const override = currentOverride.actions[index] ?? {};
              return (
                <Card key={`${selectedRole}-action-${index}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-serif text-lg">Action #{index + 1}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-[#c5ccc2]/40 bg-[#faf9f6] px-3 py-2">
                      <p className="text-xs text-[#666666]">Default: {item.title}</p>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`action-hidden-${index}`} className="text-xs text-[#666666]">
                          Hidden
                        </Label>
                        <Switch
                          id={`action-hidden-${index}`}
                          checked={Boolean(override.hidden)}
                          onCheckedChange={(checked) =>
                            updateOverrideItem("actions", index, (current) => ({
                              ...current,
                              hidden: checked,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Title Override</Label>
                      <Input
                        value={override.title ?? ""}
                        placeholder={item.title}
                        onChange={(event) =>
                          updateOverrideItem("actions", index, (current) => ({
                            ...current,
                            title: event.target.value || undefined,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Description Override</Label>
                      <Textarea
                        rows={2}
                        value={override.description ?? ""}
                        placeholder={item.description}
                        onChange={(event) =>
                          updateOverrideItem("actions", index, (current) => ({
                            ...current,
                            description: event.target.value || undefined,
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Action Label Override</Label>
                        <Input
                          value={override.actionLabel ?? ""}
                          placeholder={item.actionLabel}
                          onChange={(event) =>
                            updateOverrideItem("actions", index, (current) => ({
                              ...current,
                              actionLabel: event.target.value || undefined,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Action Link Override</Label>
                        <Input
                          value={override.actionHref ?? ""}
                          placeholder={item.actionHref}
                          onChange={(event) =>
                            updateOverrideItem("actions", index, (current) => ({
                              ...current,
                              actionHref: event.target.value || undefined,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="preview" className="space-y-5">
            <Card className="glass-subtle border-0">
              <CardHeader className="pb-2">
                <CardTitle className="font-serif text-lg">Highlights Preview</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {previewExperience.highlights.items.map((item) => (
                  <div key={`preview-highlight-${item.title}`} className="rounded-lg border border-[#c5ccc2]/40 p-3">
                    <p className="text-xs text-[#999999]">{item.title}</p>
                    <p className="mt-1 text-lg font-semibold text-[#1a1a1a]">{item.value}</p>
                    <p className="mt-1 text-xs text-[#666666]">{item.description}</p>
                    {item.actionLabel && (
                      <Badge variant="outline" className="mt-2 text-[10px]">
                        {item.actionLabel}
                      </Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="glass-subtle border-0">
              <CardHeader className="pb-2">
                <CardTitle className="font-serif text-lg">Actions Preview</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {previewExperience.actions.map((item) => (
                  <div key={`preview-action-${item.title}`} className="rounded-lg border border-[#c5ccc2]/40 p-3">
                    <p className="text-sm font-medium text-[#1a1a1a]">{item.title}</p>
                    <p className="mt-1 text-xs text-[#666666]">{item.description}</p>
                    <Badge variant="secondary" className="mt-2 text-[10px]">
                      {item.actionLabel}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
