"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { usePreferences } from "@/hooks/use-preferences";
import { useAuth } from "@/hooks/use-auth";
import { Mail, MessageSquare, Bell, Save } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { preferences, isLoading, updatePreferences } = usePreferences(user?.id);
  
  // Local state for form
  const [emailNewsletter, setEmailNewsletter] = useState(preferences?.emailNewsletterMonthly ?? true);
  const [emailEvents, setEmailEvents] = useState(preferences?.emailEvents ?? true);
  const [emailGiving, setEmailGiving] = useState(preferences?.emailGivingConfirmations ?? true);
  const [smsEnabled, setSmsEnabled] = useState(preferences?.smsEnabled ?? false);
  const [smsGiftConfirmations, setSmsGiftConfirmations] = useState(preferences?.smsGiftConfirmations ?? false);
  const [mailEnabled, setMailEnabled] = useState(preferences?.mailEnabled ?? true);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-[#666666]">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-['Cormorant_Garamond'] text-3xl font-semibold text-[#1a1a1a]">
          Settings
        </h1>
        <p className="mt-1 text-[#666666]">
          Manage your communication preferences and account settings.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Email Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="font-['Cormorant_Garamond'] flex items-center gap-2">
                <Mail className="h-5 w-5 text-[#2b4d24]" />
                Email Preferences
              </CardTitle>
              <CardDescription>
                Choose which emails you&apos;d like to receive from Favor International.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-newsletter" className="text-base">Monthly Newsletter</Label>
                  <p className="text-sm text-[#666666]">
                    Receive our monthly newsletter with updates and stories.
                  </p>
                </div>
                <Switch
                  id="email-newsletter"
                  checked={emailNewsletter}
                  onCheckedChange={setEmailNewsletter}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-events" className="text-base">Event Notifications</Label>
                  <p className="text-sm text-[#666666]">
                    Get notified about upcoming events and webinars.
                  </p>
                </div>
                <Switch
                  id="email-events"
                  checked={emailEvents}
                  onCheckedChange={setEmailEvents}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-giving" className="text-base">Giving Confirmations</Label>
                  <p className="text-sm text-[#666666]">
                    Receive receipts and confirmations for your gifts.
                  </p>
                </div>
                <Switch
                  id="email-giving"
                  checked={emailGiving}
                  onCheckedChange={setEmailGiving}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-reports" className="text-base">Quarterly & Annual Reports</Label>
                  <p className="text-sm text-[#666666]">
                    Receive impact reports and financial updates.
                  </p>
                </div>
                <Switch
                  id="email-reports"
                  checked={preferences?.emailQuarterlyReport ?? true}
                />
              </div>
            </CardContent>
          </Card>

          {/* SMS Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="font-['Cormorant_Garamond'] flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-[#2b4d24]" />
                SMS / Text Preferences
              </CardTitle>
              <CardDescription>
                Manage your text message notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sms-enabled" className="text-base">Enable SMS</Label>
                  <p className="text-sm text-[#666666]">
                    Allow us to send you text messages.
                  </p>
                </div>
                <Switch
                  id="sms-enabled"
                  checked={smsEnabled}
                  onCheckedChange={setSmsEnabled}
                />
              </div>

              {smsEnabled && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="sms-gifts" className="text-base">Gift Confirmations</Label>
                      <p className="text-sm text-[#666666]">
                        Get a text when your gift is processed.
                      </p>
                    </div>
                    <Switch
                      id="sms-gifts"
                      checked={smsGiftConfirmations}
                      onCheckedChange={setSmsGiftConfirmations}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Mail Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="font-['Cormorant_Garamond'] flex items-center gap-2">
                <Bell className="h-5 w-5 text-[#2b4d24]" />
                Direct Mail Preferences
              </CardTitle>
              <CardDescription>
                Choose what you&apos;d like to receive by postal mail.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="mail-enabled" className="text-base">Enable Direct Mail</Label>
                  <p className="text-sm text-[#666666]">
                    Receive printed materials by mail.
                  </p>
                </div>
                <Switch
                  id="mail-enabled"
                  checked={mailEnabled}
                  onCheckedChange={setMailEnabled}
                />
              </div>

              {mailEnabled && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="mail-annual" className="text-base">Annual Report</Label>
                      <p className="text-sm text-[#666666]">
                        Receive printed annual impact report.
                      </p>
                    </div>
                    <Switch
                      id="mail-annual"
                      checked={preferences?.mailAnnualReport ?? true}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Button className="bg-[#2b4d24] hover:bg-[#1a3a15]">
            <Save className="mr-2 h-4 w-4" />
            Save Preferences
          </Button>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="bg-[#f5f5f0]">
            <CardHeader>
              <CardTitle className="font-['Cormorant_Garamond'] text-lg">Privacy Note</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#666666]">
                Your preferences are stored securely and synced with our constituent management 
                system. Changes may take up to 24 hours to fully propagate across all systems.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-['Cormorant_Garamond'] text-lg">Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-[#666666]">
                Contact our partner support team for assistance with your account.
              </p>
              <Button variant="outline" className="w-full">
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
