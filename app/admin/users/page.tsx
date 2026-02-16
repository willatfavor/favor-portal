"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { User } from "@/types";
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
import { toast } from "sonner";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed");
      const payload = await response.json();
      setUsers(Array.isArray(payload.users) ? payload.users : []);
    } catch {
      toast.error("Unable to load users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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

  async function handleSave() {
    if (!editing) return;
    try {
      const response = await fetch(`/api/admin/users/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editing.firstName,
          lastName: editing.lastName,
          email: editing.email,
          constituentType: editing.constituentType,
          isAdmin: editing.isAdmin,
        }),
      });

      if (!response.ok) throw new Error("Failed");

      const payload = await response.json();
      const updated = payload.user as User;
      setUsers((prev) => prev.map((user) => (user.id === updated.id ? updated : user)));
      setEditing(null);
      toast.success("User updated");
    } catch {
      toast.error("Unable to update user");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-[#1a1a1a]">Partner Directory</h1>
          <p className="text-sm text-[#666666]">Manage mock users and access levels.</p>
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

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-[#e5e5e0]">
            {(isLoading ? [] : filtered).map((user) => (
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
                      <Button variant="outline" size="sm" onClick={() => setEditing(user)}>
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg glass-elevated border-0">
                      <DialogHeader>
                        <DialogTitle className="font-serif text-xl">Edit User</DialogTitle>
                      </DialogHeader>
                      {editing && (
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
                            <Label>RDD Assignment (Synced)</Label>
                            <Input value={editing.rddAssignment ?? ""} disabled />
                            <p className="text-xs text-[#999999]">
                              These fields are read-only and will sync from Blackbaud.
                            </p>
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
                            <Button className="bg-[#2b4d24] hover:bg-[#1a3a15]" onClick={handleSave}>
                              Save Changes
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setEditing(null);
                                loadUsers();
                              }}
                            >
                              Cancel
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
        <Button variant="outline" onClick={loadUsers}>Refresh</Button>
      </div>
    </div>
  );
}
