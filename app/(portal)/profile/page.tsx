"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { recordActivity } from "@/lib/mock-store";
import type { User as UserType } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Phone, Building, Edit, Camera, Heart, Save, Check } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { getGivingTier } from "@/lib/constants";
import { ContactSupportDialog } from "@/components/portal/contact-support-dialog";

export default function ProfilePage() {
  const { user, isLoading, updateDevUser, isDev } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const val = (key: string, fallback: string) => form[key] ?? fallback;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-[#666666]">Loading profile...</div>
      </div>
    );
  }

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : "??";

  const tier = getGivingTier(user?.lifetimeGivingTotal ?? 0);

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      if (isDev && updateDevUser && user) {
        const updates: Partial<UserType> = {};
        if (form.firstName && form.firstName !== user.firstName) updates.firstName = form.firstName;
        if (form.lastName && form.lastName !== user.lastName) updates.lastName = form.lastName;
        if (form.email && form.email !== user.email) updates.email = form.email;
        if (form.phone && form.phone !== user.phone) updates.phone = form.phone;
        if (Object.keys(updates).length > 0) {
          updateDevUser(updates);
          recordActivity({
            id: `activity-${Date.now()}`,
            type: "profile_updated",
            userId: user.id,
            createdAt: new Date().toISOString(),
            metadata: { fields: Object.keys(updates).join(",") },
          });
        }
      }
      setSaving(false);
      setSaved(true);
      toast.success("Profile updated");
      setTimeout(() => setSaved(false), 2000);
    }, 800);
  }

  return (
    <div className="space-y-10">
      <div>
        <nav className="mb-2 flex items-center gap-1 text-xs text-[#999999]">
          <Link href="/dashboard" className="hover:text-[#666666]">Home</Link>
          <span>/</span>
          <span className="font-medium text-[#1a1a1a]">Profile</span>
        </nav>
        <h1 className="font-serif text-3xl font-semibold text-[#1a1a1a]">Your Profile</h1>
        <p className="mt-1 text-sm text-[#666666]">
          Manage your personal information and partnership details.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="relative mx-auto mb-4 inline-block">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user?.avatarUrl} />
                  <AvatarFallback className="bg-[#2b4d24] text-[#FFFEF9] text-xl">{initials}</AvatarFallback>
                </Avatar>
                <button
                  className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full glass-inset glass-transition hover:bg-white/70"
                  onClick={() => toast.info("Photo upload coming soon")}
                >
                  <Camera className="h-3.5 w-3.5 text-[#666666]" />
                </button>
              </div>
              <h2 className="font-serif text-xl font-semibold text-[#1a1a1a]">{user?.firstName} {user?.lastName}</h2>
              <p className="text-sm text-[#666666]">{user?.email}</p>
              <div className="mt-3 flex justify-center gap-2">
                <Badge className="bg-[#2b4d24] text-[#FFFEF9]">Partner</Badge>
                <Badge variant="outline" className="text-[#8b957b]">{tier.name}</Badge>
              </div>
              <Separator className="my-5" />
              <div className="space-y-3 text-left text-sm">
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-[#999999]" /><span>{user?.email}</span></div>
                {user?.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-[#999999]" /><span>{user.phone}</span></div>}
                <div className="flex items-center gap-2"><Building className="h-4 w-4 text-[#999999]" /><span>Partner since {new Date(user?.createdAt || "").getFullYear()}</span></div>
                {user?.rddAssignment && <div className="flex items-center gap-2"><User className="h-4 w-4 text-[#999999]" /><span>RDD: {user.rddAssignment}</span></div>}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#2b4d24] to-[#3d6633] text-white">
            <CardContent className="p-5 text-center">
              <Heart className="mx-auto h-6 w-6 text-white/60" />
              <p className="mt-2 text-2xl font-bold">{formatCurrency(user?.lifetimeGivingTotal ?? 0)}</p>
              <p className="text-xs text-white/60">Lifetime Giving</p>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="font-serif flex items-center gap-2 text-lg">
                <Edit className="h-4 w-4 text-[#2b4d24]" /> Edit Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input value={val("firstName", user?.firstName ?? "")} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input value={val("lastName", user?.lastName ?? "")} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={val("email", user?.email ?? "")} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input type="tel" value={val("phone", user?.phone ?? "")} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Add phone number" />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Address</Label>
                <Input placeholder="Street address" value={val("street", "")} onChange={(e) => setForm({ ...form, street: e.target.value })} />
                <div className="grid gap-4 sm:grid-cols-3">
                  <Input placeholder="City" value={val("city", "")} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  <Input placeholder="State" value={val("state", "")} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                  <Input placeholder="ZIP" value={val("zip", "")} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="bg-[#2b4d24] hover:bg-[#1a3a15]" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : saved ? <><Check className="mr-2 h-4 w-4" />Saved</> : <><Save className="mr-2 h-4 w-4" />Save Changes</>}
                </Button>
                <Button variant="outline" onClick={() => setForm({})}>Cancel</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="font-serif text-lg">Account Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg glass-inset p-4 glass-transition">
                <div>
                  <p className="text-sm font-medium text-[#1a1a1a]">Communication Preferences</p>
                  <p className="text-xs text-[#666666]">Manage email and SMS settings</p>
                </div>
                <Button variant="outline" size="sm" asChild><Link href="/settings">Manage</Link></Button>
              </div>
              <div className="flex items-center justify-between rounded-lg glass-inset p-4 glass-transition">
                <div>
                  <p className="text-sm font-medium text-[#1a1a1a]">Need Help?</p>
                  <p className="text-xs text-[#666666]">Contact our partner support team</p>
                </div>
                <ContactSupportDialog trigger={<Button variant="outline" size="sm">Contact</Button>} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
