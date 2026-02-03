"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useCourses } from "@/hooks/use-courses";
import { useContent } from "@/hooks/use-content";
import { canAccessCourse, canAccessContent } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, Sparkles, Send, BookOpen, FileText } from "lucide-react";

const RESPONSES = [
  "Based on your giving history, the Africa Programs Overview course is a great next step.",
  "You might find the Q4 2025 Impact Report helpful before your next partnership call.",
  "If you are planning a church event, the Mission Sunday Toolkit is ready in the content library.",
  "Consider scheduling a check-in with your Regional Development Director for tailored updates.",
];

export default function AssistantPage() {
  const { user } = useAuth();
  const { courses } = useCourses(user?.id);
  const { items } = useContent();
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hello! I can help you find content, courses, and next steps." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const recommendations = useMemo(() => {
    const type = user?.constituentType ?? "individual";
    const courseRecs = courses.filter((c) => canAccessCourse(c.accessLevel, type)).slice(0, 3);
    const contentRecs = items.filter((c) => canAccessContent(c.accessLevel, type)).slice(0, 3);
    return { courseRecs, contentRecs };
  }, [courses, items, user]);

  function sendMessage() {
    if (!input.trim()) return;
    const next = [...messages, { role: "user", text: input.trim() }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setTimeout(() => {
      const response = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
      setMessages([...next, { role: "assistant", text: response }]);
      setLoading(false);
    }, 700);
  }

  return (
    <div className="space-y-10">
      <div>
        <nav className="mb-2 flex items-center gap-1 text-xs text-[#999999]">
          <Link href="/dashboard" className="hover:text-[#666666]">Home</Link>
          <span>/</span>
          <span className="font-medium text-[#1a1a1a]">Insights</span>
        </nav>
        <h1 className="font-serif text-3xl font-semibold text-[#1a1a1a]">Favor Insights</h1>
        <p className="mt-1 text-sm text-[#666666]">
          Personalized recommendations and an AI-powered assistant, running in mock mode.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card className="glass-pane">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2b4d24]/10">
                <Bot className="h-5 w-5 text-[#2b4d24]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1a1a1a]">Favor Assistant</p>
                <p className="text-xs text-[#999999]">Ask about courses, reports, and next steps.</p>
              </div>
            </div>

            <div className="space-y-3 rounded-xl glass-inset p-4 max-h-[320px] overflow-y-auto">
              {messages.map((msg, idx) => (
                <div
                  key={`${msg.role}-${idx}`}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    msg.role === "assistant"
                      ? "bg-white/70 text-[#1a1a1a]"
                      : "bg-[#2b4d24]/10 text-[#1a1a1a] ml-auto"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
              {loading && (
                <div className="text-xs text-[#999999]">Assistant is typing...</div>
              )}
            </div>

            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
              />
              <Button className="bg-[#2b4d24] hover:bg-[#1a3a15]" onClick={sendMessage}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="glass-subtle border-0">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-[#2b4d24]">
                <Sparkles className="h-4 w-4" />
                <p className="text-sm font-medium">Recommended Courses</p>
              </div>
              {recommendations.courseRecs.map((course) => (
                <div key={course.id} className="flex items-center justify-between rounded-lg glass-inset p-3">
                  <div>
                    <p className="text-sm text-[#1a1a1a]">{course.title}</p>
                    <p className="text-xs text-[#999999]">{course.accessLevel.replace("_", " ")}</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/courses/${course.id}`}>
                      <BookOpen className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-subtle border-0">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-[#2b4d24]">
                <FileText className="h-4 w-4" />
                <p className="text-sm font-medium">Recommended Content</p>
              </div>
              {recommendations.contentRecs.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg glass-inset p-3">
                  <div>
                    <p className="text-sm text-[#1a1a1a]">{item.title}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {item.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
