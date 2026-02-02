"use client";

import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Phone, Building, MapPin, Edit, Camera, Heart } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-[#666666]">Loading profile...</div>
      </div>
    );
  }

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : "??";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-['Cormorant_Garamond'] text-3xl font-semibold text-[#1a1a1a]">
          Your Profile
        </h1>
        <p className="mt-1 text-[#666666]">
          Manage your personal information and partnership details.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="relative mx-auto mb-4 inline-block">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user?.avatarUrl} alt={`${user?.firstName} ${user?.lastName}`} />
                  <AvatarFallback className="bg-[#2b4d24] text-[#FFFEF9] text-2xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>

              <h2 className="font-['Cormorant_Garamond'] text-xl font-semibold text-[#1a1a1a]">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-[#666666]">{user?.email}</p>

              <Badge className="mt-4 bg-[#2b4d24] text-[#FFFEF9]">
                {user?.constituentType.replace("_", " ")}
              </Badge>

              <Separator className="my-6" />

              <div className="space-y-3 text-left">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-[#666666]" />
                  <span className="text-[#1a1a1a]">{user?.email}</span>
                </div>
                {user?.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-[#666666]" />
                    <span className="text-[#1a1a1a]">{user?.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Building className="h-4 w-4 text-[#666666]" />
                  <span className="text-[#1a1a1a]">Partner since {new Date(user?.createdAt || "").getFullYear()}</span>
                </div>
                {user?.rddAssignment && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-[#666666]" />
                    <span className="text-[#1a1a1a]">RDD: {user?.rddAssignment}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="mt-6 bg-gradient-to-br from-[#2b4d24] to-[#3d6633] text-[#FFFEF9]">
            <CardContent className="pt-6">
              <div className="text-center">
                <Heart className="mx-auto h-8 w-8 mb-2" />
                <p className="text-3xl font-bold">${user?.lifetimeGivingTotal.toLocaleString()}</p>
                <p className="text-sm text-[#FFFEF9]/80">Lifetime Giving</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-['Cormorant_Garamond'] flex items-center gap-2">
                <Edit className="h-5 w-5 text-[#2b4d24]" />
                Edit Profile
              </CardTitle>
              <CardDescription>
                Update your personal information. This will sync with our records.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" defaultValue={user?.firstName} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" defaultValue={user?.lastName} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" defaultValue={user?.email} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" defaultValue={user?.phone || ""} placeholder="Add phone number" />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <div className="grid gap-4">
                  <Input id="street" placeholder="Street address" />
                  <div className="grid gap-4 md:grid-cols-3">
                    <Input id="city" placeholder="City" />
                    <Input id="state" placeholder="State" />
                    <Input id="zip" placeholder="ZIP code" />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="bg-[#2b4d24] hover:bg-[#1a3a15]">
                  Save Changes
                </Button>
                <Button variant="outline">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Account Settings */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="font-['Cormorant_Garamond']">Account Settings</CardTitle>
              <CardDescription>Manage your account preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-[#e5e5e0] p-4">
                <div>
                  <p className="font-medium text-[#1a1a1a]">Change Password</p>
                  <p className="text-sm text-[#666666]">Update your login credentials</p>
                </div>
                <Button variant="outline">Update</Button>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[#e5e5e0] p-4">
                <div>
                  <p className="font-medium text-[#1a1a1a]">Communication Preferences</p>
                  <p className="text-sm text-[#666666]">Manage email and SMS settings</p>
                </div>
                <Button variant="outline" asChild>
                  <Link href="/settings">Manage</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
