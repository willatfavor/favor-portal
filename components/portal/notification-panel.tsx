"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Heart,
  GraduationCap,
  Calendar,
  Bell,
  FileText,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/local-storage";
import type { Notification } from "@/lib/portal-mock-data";
import Link from "next/link";

const TYPE_ICONS: Record<string, React.ElementType> = {
  gift: Heart,
  course: GraduationCap,
  event: Calendar,
  system: Bell,
  report: FileText,
};

interface NotificationPanelProps {
  onClose: () => void;
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    setNotifications(getNotifications());
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function handleMarkAllRead() {
    setNotifications(markAllNotificationsRead());
  }

  function handleClick(id: string) {
    setNotifications(markNotificationRead(id));
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[#c5ccc2]/20 px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="font-serif text-lg font-semibold text-[#1a1a1a]">
            Notifications
          </h2>
          {unreadCount > 0 && (
            <Badge className="bg-[#2b4d24] text-[#FFFEF9] text-[10px] px-1.5 py-0">
              {unreadCount}
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-[#2b4d24] hover:text-[#1a3a15]"
            onClick={handleMarkAllRead}
          >
            <CheckCheck className="mr-1 h-3.5 w-3.5" />
            Mark all read
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="h-8 w-8 text-[#c5ccc2]" />
            <p className="mt-3 text-sm text-[#666666]">No notifications yet</p>
          </div>
        ) : (
          <ul>
            {notifications.map((notif) => {
              const Icon = TYPE_ICONS[notif.type] ?? Bell;
              const content = (
                <li
                  key={notif.id}
                  className={cn(
                    "flex gap-3 border-b border-[#c5ccc2]/15 px-5 py-4 glass-transition hover:bg-white/40 cursor-pointer",
                    !notif.read && "bg-[#2b4d24]/[0.02]"
                  )}
                  onClick={() => handleClick(notif.id)}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      !notif.read
                        ? "bg-[#2b4d24]/10"
                        : "bg-white/60"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        !notif.read ? "text-[#2b4d24]" : "text-[#999999]"
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          "text-sm",
                          !notif.read
                            ? "font-medium text-[#1a1a1a]"
                            : "text-[#666666]"
                        )}
                      >
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#2b4d24]" />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-[#999999] line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="mt-1 text-[10px] text-[#999999]">
                      {new Date(notif.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </li>
              );

              if (notif.link) {
                return (
                  <Link
                    key={notif.id}
                    href={notif.link}
                    onClick={() => {
                      handleClick(notif.id);
                      onClose();
                    }}
                    className="block"
                  >
                    {content}
                  </Link>
                );
              }
              return content;
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
