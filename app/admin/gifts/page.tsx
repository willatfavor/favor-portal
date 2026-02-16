"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Download,
  Filter,
  Eye,
  MoreHorizontal,
  Gift as GiftIcon,
  TrendingUp,
  Users,
  Calendar,
  FileText,
  RefreshCw,
  CheckCircle,
  Clock,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import type { Gift, User } from "@/types";

export default function AdminGiftsPage() {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "one-time" | "recurring">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "portal" | "imported">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "year">("all");
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const loadData = useCallback(() => {
    setIsLoading(true);
    fetch("/api/admin/gifts", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed");
        return response.json();
      })
      .then((payload) => {
        setGifts(Array.isArray(payload.gifts) ? payload.gifts : []);
        setUsers(Array.isArray(payload.users) ? payload.users : []);
      })
      .catch(() => {
        toast.error("Unable to load gifts");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredGifts = useMemo(() => {
    let filtered = [...gifts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((gift) => {
        const user = users.find((u) => u.id === gift.userId);
        return (
          gift.designation.toLowerCase().includes(query) ||
          gift.id.toLowerCase().includes(query) ||
          user?.firstName.toLowerCase().includes(query) ||
          user?.lastName.toLowerCase().includes(query) ||
          user?.email.toLowerCase().includes(query)
        );
      });
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((gift) =>
        typeFilter === "recurring" ? gift.isRecurring : !gift.isRecurring
      );
    }

    // Source filter
    if (sourceFilter !== "all") {
      filtered = filtered.filter((gift) => gift.source === sourceFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      filtered = filtered.filter((gift) => {
        const giftDate = new Date(gift.date);
        switch (dateFilter) {
          case "today":
            return giftDate.toDateString() === now.toDateString();
          case "week":
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return giftDate >= weekAgo;
          case "month":
            return (
              giftDate.getMonth() === now.getMonth() &&
              giftDate.getFullYear() === now.getFullYear()
            );
          case "year":
            return giftDate.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [gifts, users, searchQuery, typeFilter, sourceFilter, dateFilter]);

  const stats = useMemo(() => {
    const totalAmount = filteredGifts.reduce((sum, g) => sum + g.amount, 0);
    const oneTimeCount = filteredGifts.filter((g) => !g.isRecurring).length;
    const recurringCount = filteredGifts.filter((g) => g.isRecurring).length;
    const uniqueDonors = new Set(filteredGifts.map((g) => g.userId)).size;
    const pendingReceipts = filteredGifts.filter((g) => !g.receiptSent).length;

    return {
      totalAmount,
      oneTimeCount,
      recurringCount,
      uniqueDonors,
      pendingReceipts,
      averageGift: filteredGifts.length > 0 ? totalAmount / filteredGifts.length : 0,
    };
  }, [filteredGifts]);

  function exportToCSV() {
    const headers = ["ID", "Date", "Donor", "Amount", "Designation", "Type", "Source", "Receipt"];
    const rows = filteredGifts.map((gift) => {
      const user = users.find((u) => u.id === gift.userId);
      return [
        gift.id,
        new Date(gift.date).toLocaleDateString(),
        user ? `${user.firstName} ${user.lastName}` : "Unknown",
        gift.amount,
        gift.designation,
        gift.isRecurring ? "Recurring" : "One-time",
        gift.source || "imported",
        gift.receiptSent ? "Sent" : "Pending",
      ];
    });

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `favor-gifts-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Gifts exported successfully");
  }

  function viewGiftDetail(gift: Gift) {
    setSelectedGift(gift);
    setIsDetailOpen(true);
  }

  function getDonorName(userId: string) {
    const user = users.find((u) => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : "Unknown";
  }

  function getDonorEmail(userId: string) {
    const user = users.find((u) => u.id === userId);
    return user?.email || "N/A";
  }

  function getDonorType(userId: string) {
    const user = users.find((u) => u.id === userId);
    return user?.constituentType || "individual";
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[#1a1a1a]">Gifts Management</h1>
          <p className="mt-1 text-sm text-[#666666]">View and manage all donations across the platform.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-[#999999] flex items-center gap-2">
              <GiftIcon className="h-3.5 w-3.5 text-[#2b4d24]" />
              Total Gifts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-[#1a1a1a]">{filteredGifts.length}</div>
            <p className="text-xs text-[#666666]">{stats.oneTimeCount} one-time · {stats.recurringCount} recurring</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-[#999999] flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-[#2b4d24]" />
              Total Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-[#1a1a1a]">{formatCurrency(stats.totalAmount)}</div>
            <p className="text-xs text-[#666666]">Avg: {formatCurrency(stats.averageGift)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-[#999999] flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-[#2b4d24]" />
              Unique Donors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-[#1a1a1a]">{stats.uniqueDonors}</div>
            <p className="text-xs text-[#666666]">Active supporters</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-[#999999] flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-[#2b4d24]" />
              Pending Receipts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-[#1a1a1a]">{stats.pendingReceipts}</div>
            <p className="text-xs text-[#666666]">Need processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-[#999999] flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-[#2b4d24]" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-[#1a1a1a]">
              {formatCurrency(
                filteredGifts
                  .filter((g) => new Date(g.date).getMonth() === new Date().getMonth())
                  .reduce((sum, g) => sum + g.amount, 0)
              )}
            </div>
            <p className="text-xs text-[#666666]">{new Date().toLocaleString("default", { month: "long" })}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999999]" />
              <Input
                placeholder="Search by donor, designation, or gift ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
                <SelectTrigger className="w-36">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="one-time">One-time</SelectItem>
                  <SelectItem value="recurring">Recurring</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as typeof sourceFilter)}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="portal">Portal</SelectItem>
                  <SelectItem value="imported">Imported</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as typeof dateFilter)}>
                <SelectTrigger className="w-36">
                  <Calendar className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gifts Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gift ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Donor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden sm:table-cell">Designation</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#999999]" />
                    </TableCell>
                  </TableRow>
                ) : filteredGifts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-[#666666]">
                      No gifts found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGifts.map((gift) => (
                    <TableRow key={gift.id}>
                      <TableCell className="font-mono text-xs text-[#666666]">
                        {gift.id}
                      </TableCell>
                      <TableCell className="text-sm text-[#666666]">
                        {new Date(gift.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-[#1a1a1a]">{getDonorName(gift.userId)}</p>
                          <p className="text-xs text-[#999999]">{getDonorEmail(gift.userId)}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-[#1a1a1a]">
                        {formatCurrency(gift.amount)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-[#666666]">
                        {gift.designation}
                      </TableCell>
                      <TableCell>
                        <Badge variant={gift.isRecurring ? "default" : "secondary"} className="text-[10px]">
                          {gift.isRecurring ? "Recurring" : "One-time"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {gift.receiptSent ? (
                          <Badge variant="outline" className="text-[10px] text-[#2b4d24]">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Sent
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            <Clock className="mr-1 h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => viewGiftDetail(gift)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              Download Receipt
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Gift Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Gift Details</DialogTitle>
            <DialogDescription>Complete information about this donation.</DialogDescription>
          </DialogHeader>
          {selectedGift && (
            <div className="space-y-4">
              <div className="rounded-lg glass-inset p-4">
                <p className="text-xs text-[#999999]">Amount</p>
                <p className="text-3xl font-semibold text-[#1a1a1a]">
                  {formatCurrency(selectedGift.amount)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#999999]">Gift ID</p>
                  <p className="text-sm font-medium text-[#1a1a1a]">{selectedGift.id}</p>
                </div>
                <div>
                  <p className="text-xs text-[#999999]">Date</p>
                  <p className="text-sm font-medium text-[#1a1a1a]">
                    {new Date(selectedGift.date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#999999]">Type</p>
                  <p className="text-sm font-medium text-[#1a1a1a]">
                    {selectedGift.isRecurring ? "Recurring" : "One-time"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#999999]">Source</p>
                  <p className="text-sm font-medium text-[#1a1a1a]">
                    {selectedGift.source === "portal" ? "Portal" : "Imported"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-[#999999]">Designation</p>
                <p className="text-sm font-medium text-[#1a1a1a]">{selectedGift.designation}</p>
              </div>

              <div>
                <p className="text-xs text-[#999999]">Donor</p>
                <p className="text-sm font-medium text-[#1a1a1a]">{getDonorName(selectedGift.userId)}</p>
                <p className="text-xs text-[#666666]">{getDonorEmail(selectedGift.userId)}</p>
                <Badge variant="outline" className="mt-1 text-[10px]">
                  {getDonorType(selectedGift.userId)}
                </Badge>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t">
                <p className="text-sm text-[#666666]">Receipt Status:</p>
                {selectedGift.receiptSent ? (
                  <Badge variant="outline" className="text-[#2b4d24]">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Sent
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <Clock className="mr-1 h-3 w-3" />
                    Pending
                  </Badge>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
