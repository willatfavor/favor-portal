"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { User, AdminRoleKey, UserRoleAssignment } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { isDevBypass } from "@/lib/dev-mode";
import { ADMIN_ROLES } from "@/lib/admin/roles";
import {
  getMockRoles,
  getMockUsers,
  setMockRoles,
  setMockUsers,
  updateMockUser,
} from "@/lib/mock-store";
import { Card, CardContent } from "@/components/ui/card";
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
import { Search, User as UserIcon } from "lucide-react";

interface RoleAssignmentRow {
  userId: string;
  roleKeys: AdminRoleKey[];
}

function roleLabel(role: AdminRoleKey) {
  return role.replace("_", " ");
}

function mapUserRow(row: {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  constituent_type: string;
  lifetime_giving_total: number;
  rdd_assignment: string | null;
  is_admin: boolean;
  created_at: string;
  last_login: string | null;
  phone: string | null;
  blackbaud_constituent_id: string | null;
  avatar_url: string | null;
}): User {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    constituentType: row.constituent_type as User["constituentType"],
    lifetimeGivingTotal: Number(row.lifetime_giving_total),
    rddAssignment: row.rdd_assignment ?? undefined,
    isAdmin: row.is_admin,
    createdAt: row.created_at,
    lastLogin: row.last_login ?? undefined,
    phone: row.phone ?? undefined,
    blackbaudConstituentId: row.blackbaud_constituent_id ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
  };
}

export default function AdminUsersPage() {
  const supabase = useMemo(() => createClient(), []);
  const { refreshUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [rolesByUserId, setRolesByUserId] = useState<Record<string, AdminRoleKey[]>>({});
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<User | null>(null);
  const [editingRoles, setEditingRoles] = useState<AdminRoleKey[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    setMessage(null);

    if (isDevBypass) {
      const mockUsers = getMockUsers();
      const mockRoles = getMockRoles();
      const roleMap = mockRoles.reduce<Record<string, AdminRoleKey[]>>((acc, role) => {
        acc[role.userId] = acc[role.userId] || [];
        acc[role.userId].push(role.roleKey);
        return acc;
      }, {});
      setUsers(mockUsers);
      setRolesByUserId(roleMap);
      return;
    }

    const [usersResult, rolesResult] = await Promise.all([
      supabase.from("users").select("*").order("created_at", { ascending: false }),
      fetch("/api/admin/users/roles"),
    ]);

    if (usersResult.error) {
      setError(usersResult.error.message);
      return;
    }

    const rolesJson = (await rolesResult.json()) as {
      assignments?: RoleAssignmentRow[];
      error?: string;
    };
    if (!rolesResult.ok) {
      setError(rolesJson.error ?? "Unable to load role assignments");
      return;
    }

    const roleMap = (rolesJson.assignments ?? []).reduce<Record<string, AdminRoleKey[]>>(
      (acc, row) => {
        acc[row.userId] = row.roleKeys ?? [];
        return acc;
      },
      {}
    );

    setUsers((usersResult.data ?? []).map(mapUserRow));
    setRolesByUserId(roleMap);
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    return users.filter((user) => {
      const matchQuery =
        user.firstName.toLowerCase().includes(query.toLowerCase()) ||
        user.lastName.toLowerCase().includes(query.toLowerCase()) ||
        user.email.toLowerCase().includes(query.toLowerCase());
      const matchFilter = filter === "all" || user.constituentType === filter;
      return matchQuery && matchFilter;
    });
  }, [users, query, filter]);

  function openEditor(user: User) {
    setEditing({ ...user });
    setEditingRoles(rolesByUserId[user.id] ?? []);
    setError(null);
    setMessage(null);
  }

  function toggleRole(role: AdminRoleKey) {
    setEditingRoles((current) =>
      current.includes(role) ? current.filter((entry) => entry !== role) : [...current, role]
    );
  }

  async function handleSave() {
    if (!editing) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);

    if (isDevBypass) {
      const updated = updateMockUser(editing.id, {
        firstName: editing.firstName,
        lastName: editing.lastName,
        email: editing.email,
        constituentType: editing.constituentType,
        isAdmin: editing.isAdmin,
      });
      if (!updated) {
        setError("Unable to update user.");
        setIsSaving(false);
        return;
      }

      const previousRoles = getMockRoles().filter((role) => role.userId !== editing.id);
      const now = new Date().toISOString();
      const newRoles: UserRoleAssignment[] = editingRoles.map((roleKey) => ({
        id: `role-${editing.id}-${roleKey}`,
        userId: editing.id,
        roleKey,
        createdAt: now,
        updatedAt: now,
      }));
      setMockRoles([...previousRoles, ...newRoles]);
      setUsers((current) => current.map((user) => (user.id === editing.id ? updated : user)));
      setRolesByUserId((current) => ({ ...current, [editing.id]: editingRoles }));
      setEditing(updated);
      await refreshUser();
      setMessage("User and roles updated.");
      setIsSaving(false);
      return;
    }

    const { error: userError } = await supabase
      .from("users")
      .update({
        first_name: editing.firstName,
        last_name: editing.lastName,
        email: editing.email,
        constituent_type: editing.constituentType,
        is_admin: Boolean(editing.isAdmin),
      })
      .eq("id", editing.id);
    if (userError) {
      setError(userError.message);
      setIsSaving(false);
      return;
    }

    const rolesResponse = await fetch("/api/admin/users/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: editing.id,
        roleKeys: editingRoles,
        isAdmin: Boolean(editing.isAdmin),
      }),
    });
    const rolesJson = (await rolesResponse.json()) as {
      roleKeys?: AdminRoleKey[];
      error?: string;
    };
    if (!rolesResponse.ok) {
      setError(rolesJson.error ?? "Unable to update user roles");
      setIsSaving(false);
      return;
    }

    setUsers((current) => current.map((user) => (user.id === editing.id ? editing : user)));
    setRolesByUserId((current) => ({ ...current, [editing.id]: rolesJson.roleKeys ?? editingRoles }));
    await refreshUser();
    setMessage("User and roles updated.");
    setIsSaving(false);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-[#1a1a1a]">Partner Directory</h1>
          <p className="text-sm text-[#666666]">Manage users, admin access, and role assignments.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999999]" />
            <Input
              placeholder="Search users..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {[
                "individual",
                "major_donor",
                "church",
                "foundation",
                "daf",
                "ambassador",
                "volunteer",
              ].map((type) => (
                <SelectItem key={type} value={type}>
                  {type.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {message && (
        <Card className="border-[#2b4d24]/40 bg-[#2b4d24]/5">
          <CardContent className="p-3 text-sm text-[#2b4d24]">{message}</CardContent>
        </Card>
      )}
      {error && (
        <Card className="border-[#a36d4c]/40 bg-[#a36d4c]/10">
          <CardContent className="p-3 text-sm text-[#a36d4c]">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-[#e5e5e0]">
            {filtered.map((user) => (
              <div key={user.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2b4d24]/10">
                    <UserIcon className="h-5 w-5 text-[#2b4d24]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1a1a1a]">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-[#999999]">{user.email}</p>
                    {(rolesByUserId[user.id] ?? []).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(rolesByUserId[user.id] ?? []).map((role) => (
                          <Badge key={role} variant="outline" className="text-[10px]">
                            {roleLabel(role)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-[10px] text-[#8b957b]">
                    {user.constituentType.replace("_", " ")}
                  </Badge>
                  {user.isAdmin && (
                    <Badge className="bg-[#2b4d24] text-[#FFFEF9] text-[10px]">Admin</Badge>
                  )}
                  <Badge variant="secondary" className="text-[10px]">
                    ${user.lifetimeGivingTotal.toLocaleString()}
                  </Badge>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => openEditor(user)}>
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg glass-elevated border-0">
                      <DialogHeader>
                        <DialogTitle className="font-serif text-xl">Edit User</DialogTitle>
                      </DialogHeader>
                      {editing && editing.id === user.id && (
                        <div className="space-y-4">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label>First Name</Label>
                              <Input
                                value={editing.firstName}
                                onChange={(e) => setEditing({ ...editing, firstName: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label>Last Name</Label>
                              <Input
                                value={editing.lastName}
                                onChange={(e) => setEditing({ ...editing, lastName: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label>Email</Label>
                            <Input
                              value={editing.email}
                              onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                            />
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label>Constituent Type</Label>
                              <Select
                                value={editing.constituentType}
                                onValueChange={(value) =>
                                  setEditing({ ...editing, constituentType: value as User["constituentType"] })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {[
                                    "individual",
                                    "major_donor",
                                    "church",
                                    "foundation",
                                    "daf",
                                    "ambassador",
                                    "volunteer",
                                  ].map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {type.replace("_", " ")}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label>Lifetime Giving (Synced)</Label>
                              <Input type="number" value={editing.lifetimeGivingTotal} disabled />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label>Admin Roles</Label>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {ADMIN_ROLES.map((role) => (
                                <button
                                  key={role}
                                  type="button"
                                  onClick={() => toggleRole(role)}
                                  className={`rounded-lg border px-3 py-2 text-left text-xs ${
                                    editingRoles.includes(role)
                                      ? "border-[#2b4d24] bg-[#2b4d24]/10 text-[#1a1a1a]"
                                      : "border-[#d8d8d8] bg-white text-[#666666]"
                                  }`}
                                >
                                  {roleLabel(role)}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center justify-between rounded-xl glass-inset p-3">
                            <div>
                              <p className="text-sm font-medium text-[#1a1a1a]">Admin Access</p>
                              <p className="text-xs text-[#999999]">Grant admin console access</p>
                            </div>
                            <Button
                              variant={editing.isAdmin ? "default" : "outline"}
                              size="sm"
                              className={editing.isAdmin ? "bg-[#2b4d24]" : ""}
                              onClick={() => setEditing({ ...editing, isAdmin: !editing.isAdmin })}
                            >
                              {editing.isAdmin ? "Enabled" : "Disabled"}
                            </Button>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              className="bg-[#2b4d24] hover:bg-[#1a3a15]"
                              onClick={() => void handleSave()}
                              disabled={isSaving}
                            >
                              {isSaving ? "Saving..." : "Save Changes"}
                            </Button>
                            <Button variant="outline" onClick={() => setEditing(null)}>
                              Close
                            </Button>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => {
            if (isDevBypass) {
              const seeded = getMockUsers();
              setMockUsers(seeded);
            }
            void loadData();
          }}
        >
          {isDevBypass ? "Restore Defaults" : "Reload Users"}
        </Button>
      </div>
    </div>
  );
}
