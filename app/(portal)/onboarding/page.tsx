"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCompleteOnboarding = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/profile/onboarding", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to complete onboarding");
      }

      toast.success("Welcome to Favor International!");
      router.push("/dashboard");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="max-w-md w-full glass-elevated border-favor-sage/30">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-serif text-favor-green">Welcome!</CardTitle>
          <CardDescription className="text-favor-gray">
            We&apos;re glad you&apos;re here. Let&apos;s get your partner portal set up.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-favor-gray">
            It looks like this is your first time here or we couldn&apos;t automatically link your account to our records.
          </p>
          <div className="bg-favor-sage/10 p-4 rounded-lg border border-favor-sage/20 text-left">
            <h4 className="font-semibold text-favor-green mb-2">What&apos;s next?</h4>
            <ul className="text-xs space-y-2 list-disc list-inside text-favor-gray">
              <li>Access your giving history and tax receipts.</li>
              <li>Explore our Learning Management System.</li>
              <li>Stay updated with exclusive content and reports.</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full bg-favor-green hover:bg-favor-green/90 text-white"
            onClick={handleCompleteOnboarding}
            disabled={loading}
          >
            {loading ? "Setting up..." : "Complete Setup"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
