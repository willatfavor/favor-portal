"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Heart, CheckCircle, Download, ArrowLeft, ArrowRight } from "lucide-react";
import { GIVING_DESIGNATIONS } from "@/lib/portal-mock-data";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

type Step = "amount" | "details" | "confirm" | "receipt";

const PRESET_AMOUNTS = [25, 50, 100, 250, 500, 1000];

interface GiveNowDialogProps {
  trigger?: React.ReactNode;
  onGiftComplete?: () => void;
}

export function GiveNowDialog({ trigger, onGiftComplete }: GiveNowDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [frequency, setFrequency] = useState<"one-time" | "monthly" | "quarterly" | "annual">("one-time");
  const [designation, setDesignation] = useState("Where Most Needed");
  const [note, setNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [giftId, setGiftId] = useState<string | null>(null);

  const effectiveAmount = amount ?? (Number(customAmount) || 0);

  function reset() {
    setStep("amount");
    setAmount(null);
    setCustomAmount("");
    setFrequency("one-time");
    setDesignation("Where Most Needed");
    setNote("");
    setProcessing(false);
    setGiftId(null);
  }

  function handleOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (!isOpen) reset();
  }

  function handleConfirm() {
    if (effectiveAmount <= 0) return;
    setProcessing(true);
    fetch("/api/giving/one-time", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: effectiveAmount,
        designation,
        frequency,
        note,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to process gift");
        }
        return response.json();
      })
      .then((payload) => {
        const createdGiftId = payload?.gift?.id ? String(payload.gift.id) : `gift-${Date.now()}`;
        setGiftId(createdGiftId);
        setStep("receipt");
        onGiftComplete?.();
        toast.success("Gift received!", {
          description: `$${effectiveAmount.toLocaleString()} to ${designation}`,
        });
      })
      .catch(() => {
        toast.error("Unable to process your gift right now");
      })
      .finally(() => {
        setProcessing(false);
      });
  }

  function downloadReceipt() {
    const receiptText = [
      "FAVOR INTERNATIONAL - GIFT RECEIPT",
      "=".repeat(42),
      "",
      `Receipt #: ${giftId}`,
      `Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
      "",
      `Donor: ${user?.firstName} ${user?.lastName}`,
      `Email: ${user?.email}`,
      "",
      `Amount: $${effectiveAmount.toLocaleString()}.00`,
      `Designation: ${designation}`,
      `Frequency: ${frequency}`,
      note ? `Note: ${note}` : "",
      "",
      "Favor International, Inc.",
      "3433 Lithia Pinecrest Rd #356, Valrico, FL 33596",
      "EIN: XX-XXXXXXX",
      "501(c)(3) Non-Profit Organization",
      "",
      "All contributions are tax-deductible to the extent allowed by law.",
      "No goods or services were provided in exchange for this contribution.",
      "",
      '"Transformed Hearts Transform Nations"',
    ]
      .filter(Boolean)
      .join("\n");

    const blob = new Blob([receiptText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `favor-receipt-${giftId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Receipt downloaded");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="bg-[#2b4d24] hover:bg-[#1a3a15]">
            <Heart className="mr-2 h-4 w-4" />
            Give Now
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md glass-elevated border-0">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {step === "receipt" ? "Thank You" : "Make a Gift"}
          </DialogTitle>
          {step !== "receipt" && (
            <DialogDescription>
              Support Favor International&apos;s mission.
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Step indicator */}
        {step !== "receipt" && (
          <div className="flex items-center gap-2 text-xs text-[#999999]">
            {(["amount", "details", "confirm"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className="h-px w-6 bg-[#e5e5e0]" />}
                <span
                  className={
                    s === step
                      ? "rounded-full bg-[#2b4d24] px-2 py-0.5 text-[10px] font-medium text-white"
                      : "text-[10px]"
                  }
                >
                  {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* STEP: Amount */}
        {step === "amount" && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-2">
              {PRESET_AMOUNTS.map((a) => (
                <Button
                  key={a}
                  variant={amount === a ? "default" : "outline"}
                  className={amount === a ? "bg-[#2b4d24] hover:bg-[#1a3a15]" : ""}
                  onClick={() => {
                    setAmount(a);
                    setCustomAmount("");
                  }}
                >
                  ${a.toLocaleString()}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Or enter custom amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]">$</span>
                <Input
                  type="number"
                  min={1}
                  placeholder="0"
                  className="pl-7"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setAmount(null);
                  }}
                />
              </div>
            </div>
            <Button
              className="w-full bg-[#2b4d24] hover:bg-[#1a3a15]"
              disabled={effectiveAmount <= 0}
              onClick={() => setStep("details")}
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* STEP: Details */}
        {step === "details" && (
          <div className="space-y-5">
            <div className="rounded-lg glass-inset p-3 text-center">
              <p className="text-2xl font-semibold text-[#1a1a1a]">
                ${effectiveAmount.toLocaleString()}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                value={frequency}
                onValueChange={(v) => setFrequency(v as typeof frequency)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one-time">One-time</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Designation</Label>
              <Select value={designation} onValueChange={setDesignation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GIVING_DESIGNATIONS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Note <span className="text-[#999999]">(optional)</span>
              </Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a personal note..."
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("amount")} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                className="flex-1 bg-[#2b4d24] hover:bg-[#1a3a15]"
                onClick={() => setStep("confirm")}
              >
                Review
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP: Confirm */}
        {step === "confirm" && (
          <div className="space-y-5">
            <div className="space-y-3 rounded-lg glass-inset p-4">
              <div className="flex justify-between text-sm">
                <span className="text-[#666666]">Amount</span>
                <span className="font-semibold text-[#1a1a1a]">
                  ${effectiveAmount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#666666]">Frequency</span>
                <span className="text-[#1a1a1a]">{frequency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#666666]">Designation</span>
                <span className="text-[#1a1a1a]">{designation}</span>
              </div>
              {note && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#666666]">Note</span>
                  <span className="text-[#1a1a1a] text-right max-w-[200px] truncate">{note}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("details")} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                className="flex-1 bg-[#2b4d24] hover:bg-[#1a3a15]"
                onClick={handleConfirm}
                disabled={processing}
              >
                {processing ? "Processing..." : "Confirm Gift"}
              </Button>
            </div>
          </div>
        )}

        {/* STEP: Receipt */}
        {step === "receipt" && (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#2b4d24]/10">
              <CheckCircle className="h-8 w-8 text-[#2b4d24]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#1a1a1a]">
                ${effectiveAmount.toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-[#666666]">
                {designation} &middot; {frequency}
              </p>
            </div>
            <p className="text-sm text-[#666666]">
              Thank you for your generous gift. A receipt has been prepared.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={downloadReceipt}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Receipt
              </Button>
              <Button
                className="flex-1 bg-[#2b4d24] hover:bg-[#1a3a15]"
                onClick={() => handleOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
