"use client";

import { Gift } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface GivingTableProps {
  gifts: Gift[];
}

export function GivingTable({ gifts }: GivingTableProps) {
  if (gifts.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-[#666666]">No gifts found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Designation</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Receipt</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {gifts.map((gift) => (
            <TableRow key={gift.id}>
              <TableCell className="text-[#666666]">
                {new Date(gift.date).toLocaleDateString()}
              </TableCell>
              <TableCell className="font-medium text-[#1a1a1a]">
                ${gift.amount.toLocaleString()}
              </TableCell>
              <TableCell className="text-[#666666]">{gift.designation}</TableCell>
              <TableCell>
                <Badge variant={gift.isRecurring ? "default" : "secondary"}>
                  {gift.isRecurring ? "Recurring" : "One-time"}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={gift.receiptSent ? "outline" : "secondary"}>
                  {gift.receiptSent ? "Sent" : "Pending"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
