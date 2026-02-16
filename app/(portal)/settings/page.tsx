"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePreferences } from "@/hooks/use-preferences";
import { useAuth } from "@/hooks/use-auth";
import { Mail, MessageSquare, Bell, Save, Check, Download } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ContactSupportDialog } from "@/components/portal/contact-support-dialog";
import { PortalPageSkeleton } from "@/components/portal/portal-page-skeleton";

export default function SettingsPage() {
  const { user } = useAuth();
  const { preferences, isLoading, updatePreferences } = usePreferences(user?.id);

  const [emailNewsletter, setEmailNewsletter] = useState(true);
  const [emailEvents, setEmailEvents] = useState(true);
  const [emailGiving, setEmailGiving] = useState(true);
  const [emailReports, setEmailReports] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsGiftConfirmations, setSmsGiftConfirmations] = useState(false);
  const [mailEnabled, setMailEnabled] = useState(true);
  const [mailAnnualReport, setMailAnnualReport] = useState(true);
  const [reportPeriod, setReportPeriod] = useState("quarterly");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!preferences) return;
    setEmailNewsletter(preferences.emailNewsletterMonthly);
    setEmailEvents(preferences.emailEvents);
    setEmailGiving(preferences.emailGivingConfirmations);
    setEmailReports(preferences.emailQuarterlyReport || preferences.emailAnnualReport);
    setSmsEnabled(preferences.smsEnabled);
    setSmsGiftConfirmations(preferences.smsGiftConfirmations);
    setMailEnabled(preferences.mailEnabled);
    setMailAnnualReport(preferences.mailAnnualReport);
    setReportPeriod(preferences.reportPeriod);
  }, [preferences]);

  async function handleSave() {
    setSaving(true);
    try {
      await updatePreferences({
        emailNewsletterMonthly: emailNewsletter,
        emailEvents,
        emailGivingConfirmations: emailGiving,
        emailQuarterlyReport: emailReports,
        emailAnnualReport: emailReports,
        smsEnabled,
        smsGiftConfirmations,
        mailEnabled,
        mailAnnualReport,
        reportPeriod: reportPeriod === "annual" ? "annual" : "quarterly",
      });
      setSaving(false);
      setSaved(true);
      toast.success("Preferences saved");
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaving(false);
      toast.error("Failed to save preferences");
    }
  }

  function downloadReport() {
    const label = reportPeriod === "quarterly" ? "Q4 2025" : "Annual 2025";
    const text = [
      `FAVOR INTERNATIONAL - ${label} IMPACT REPORT`,
      "=".repeat(50),
      "",
      "Summary",
      "-------",
      "Communities Served: 12",
      "Countries Reached: 4",
      "Lives Impacted: 1,247",
      "Clean Water Wells: 3",
      "Students Sponsored: 89",
      "",
      "Financial Overview",
      "------------------",
      "Total Revenue: $1,245,000",
      "Program Expenses: $1,020,000 (82%)",
      "Administrative: $150,000 (12%)",
      "Fundraising: $75,000 (6%)",
      "",
      "Favor International, Inc.",
      '"Transformed Hearts Transform Nations"',
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `favor-${reportPeriod}-report-2025.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${label} report downloaded`);
  }

  if (isLoading) {
    return <PortalPageSkeleton />;
  }

  return (
    <div className="space-y-10">
      <div>
        <nav className="mb-2 flex items-center gap-1 text-xs text-[#999999]">
          <Link href="/dashboard" className="hover:text-[#666666]">Home</Link>
          <span>/</span>
          <span className="font-medium text-[#1a1a1a]">Settings</span>
        </nav>
        <h1 className="font-serif text-3xl font-semibold text-[#1a1a1a]">Settings</h1>
        <p className="mt-1 text-sm text-[#666666]">
          Manage your communication preferences and account settings.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Email */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="font-serif flex items-center gap-2 text-lg">
                <Mail className="h-4 w-4 text-[#2b4d24]" /> Email Preferences
              </CardTitle>
              <CardDescription>Choose which emails you receive.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {[
                { id: "newsletter", label: "Monthly Newsletter", desc: "Updates and stories from the field.", checked: emailNewsletter, set: setEmailNewsletter },
                { id: "events", label: "Event Notifications", desc: "Upcoming events and webinars.", checked: emailEvents, set: setEmailEvents },
                { id: "giving", label: "Giving Confirmations", desc: "Receipts when your gift is processed.", checked: emailGiving, set: setEmailGiving },
                { id: "reports", label: "Impact Reports", desc: "Quarterly and annual impact reports.", checked: emailReports, set: setEmailReports },
              ].map((pref, i) => (
                <div key={pref.id}>
                  {i > 0 && <Separator className="mb-5" />}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor={pref.id} className="text-sm font-medium">{pref.label}</Label>
                      <p className="text-xs text-[#666666]">{pref.desc}</p>
                    </div>
                    <Switch id={pref.id} checked={pref.checked} onCheckedChange={pref.set} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* SMS */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="font-serif flex items-center gap-2 text-lg">
                <MessageSquare className="h-4 w-4 text-[#2b4d24]" /> SMS / Text
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="settings-sms-enabled" className="text-sm font-medium">Enable SMS</Label>
                  <p className="text-xs text-[#666666]">Allow text message notifications.</p>
                </div>
                <Switch id="settings-sms-enabled" checked={smsEnabled} onCheckedChange={setSmsEnabled} />
              </div>
              {smsEnabled && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="settings-sms-gift-confirmations" className="text-sm font-medium">Gift Confirmations</Label>
                      <p className="text-xs text-[#666666]">Text when your gift is processed.</p>
                    </div>
                    <Switch id="settings-sms-gift-confirmations" checked={smsGiftConfirmations} onCheckedChange={setSmsGiftConfirmations} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Direct Mail */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="font-serif flex items-center gap-2 text-lg">
                <Bell className="h-4 w-4 text-[#2b4d24]" /> Direct Mail
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="settings-direct-mail" className="text-sm font-medium">Enable Direct Mail</Label>
                  <p className="text-xs text-[#666666]">Receive printed materials.</p>
                </div>
                <Switch id="settings-direct-mail" checked={mailEnabled} onCheckedChange={setMailEnabled} />
              </div>
              {mailEnabled && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="settings-annual-report" className="text-sm font-medium">Annual Report</Label>
                      <p className="text-xs text-[#666666]">Printed annual impact report.</p>
                    </div>
                    <Switch id="settings-annual-report" checked={mailAnnualReport} onCheckedChange={setMailAnnualReport} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Button className="bg-[#2b4d24] hover:bg-[#1a3a15]" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : saved ? <><Check className="mr-2 h-4 w-4" />Saved</> : <><Save className="mr-2 h-4 w-4" />Save Preferences</>}
          </Button>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Reports */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-serif text-lg">Reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="settings-report-period" className="text-xs text-[#999999]">Report Period</Label>
                <Select value={reportPeriod} onValueChange={setReportPeriod}>
                  <SelectTrigger id="settings-report-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-[#666666]">
                {reportPeriod === "quarterly"
                  ? "Showing Q4 2025 impact data. Switch to annual for the full year."
                  : "Showing full-year 2025 impact data."}
              </p>
              <Button variant="outline" className="w-full" onClick={downloadReport}>
                <Download className="mr-2 h-4 w-4" />
                Download {reportPeriod === "quarterly" ? "Q4" : "Annual"} Report
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-subtle border-0">
            <CardHeader className="pb-3">
              <CardTitle className="font-serif text-lg">Privacy Note</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[#666666]">
                Your preferences are stored securely. Changes may take up to 24 hours to propagate across all systems.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-serif text-lg">Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-[#666666]">Contact our partner support team for assistance.</p>
              <ContactSupportDialog />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
