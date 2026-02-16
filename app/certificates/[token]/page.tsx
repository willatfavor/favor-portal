"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ShieldAlert } from "lucide-react";

interface VerifyResponse {
  valid: boolean;
  issuedAt?: string;
  completionRate?: number;
  certificateUrl?: string | null;
  certificateNumber?: string | null;
  recipientName?: string;
  courseTitle?: string;
  error?: string;
}

export default function CertificateVerificationPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const [data, setData] = useState<VerifyResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setData({ valid: false, error: "Missing token" });
      setLoading(false);
      return;
    }
    async function run() {
      const response = await fetch(`/api/certificates/verify/${token}`);
      const json = (await response.json()) as VerifyResponse;
      setData(json);
      setLoading(false);
    }

    void run();
  }, [token]);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4 py-10">
        <div className="text-sm text-[#666666]">Verifying certificate...</div>
      </div>
    );
  }

  if (!data?.valid) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card className="glass-pane border border-[#a36d4c]/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#a36d4c]">
              <ShieldAlert className="h-5 w-5" /> Certificate Not Valid
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[#666666]">
            <p>{data?.error ?? "We could not verify this certificate token."}</p>
            <p className="text-xs text-[#999999]">Token: {token}</p>
            <Button variant="outline" asChild>
              <Link href="/">Return to Favor Portal</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Card className="glass-pane border border-[#2b4d24]/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1a1a1a]">
            <CheckCircle2 className="h-5 w-5 text-[#2b4d24]" /> Verified Certificate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-[#666666]">
          <p>
            <span className="font-medium text-[#1a1a1a]">Recipient:</span> {data.recipientName}
          </p>
          <p>
            <span className="font-medium text-[#1a1a1a]">Course:</span> {data.courseTitle}
          </p>
          <p>
            <span className="font-medium text-[#1a1a1a]">Issued:</span>{" "}
            {data.issuedAt ? new Date(data.issuedAt).toLocaleString() : "Unknown"}
          </p>
          <p>
            <span className="font-medium text-[#1a1a1a]">Completion:</span> {data.completionRate}%
          </p>
          {data.certificateNumber && (
            <Badge variant="outline" className="text-[#2b4d24] border-[#2b4d24]/50">
              Certificate #{data.certificateNumber}
            </Badge>
          )}
          {data.certificateUrl && (
            <Button variant="outline" asChild>
              <a href={data.certificateUrl} target="_blank" rel="noopener noreferrer">
                Open Certificate PDF
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
