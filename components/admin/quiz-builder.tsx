"use client";

import { QuizPayload, createEmptyQuizQuestion } from "@/lib/lms/quiz";
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
import { PlusCircle, Trash2 } from "lucide-react";

interface QuizBuilderProps {
  payload: QuizPayload;
  onChange: (payload: QuizPayload) => void;
}

export function QuizBuilder({ payload, onChange }: QuizBuilderProps) {
  function updateQuestion(
    questionId: string,
    updates: Partial<QuizPayload["questions"][number]>
  ) {
    onChange({
      ...payload,
      questions: payload.questions.map((question) =>
        question.id === questionId ? { ...question, ...updates } : question
      ),
    });
  }

  function updateOption(questionId: string, index: number, value: string) {
    onChange({
      ...payload,
      questions: payload.questions.map((question) => {
        if (question.id !== questionId) return question;
        const options = [...question.options];
        options[index] = value;
        return { ...question, options };
      }),
    });
  }

  function addQuestion() {
    onChange({
      ...payload,
      questions: [...payload.questions, createEmptyQuizQuestion(payload.questions.length + 1)],
    });
  }

  function removeQuestion(questionId: string) {
    if (payload.questions.length <= 1) return;
    onChange({
      ...payload,
      questions: payload.questions.filter((question) => question.id !== questionId),
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-[#c5ccc2]/50 bg-white/50 p-4">
      <div className="space-y-2">
        <Label>Quiz Title</Label>
        <Input
          value={payload.title ?? ""}
          onChange={(e) => onChange({ ...payload, title: e.target.value })}
          placeholder="Module assessment"
        />
      </div>

      {payload.questions.map((question, idx) => (
        <div key={question.id} className="space-y-3 rounded-xl border border-[#c5ccc2]/50 bg-white/80 p-4">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm">Question {idx + 1}</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeQuestion(question.id)}
              disabled={payload.questions.length <= 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Prompt</Label>
            <Textarea
              rows={2}
              value={question.prompt}
              onChange={(e) => updateQuestion(question.id, { prompt: e.target.value })}
              placeholder="What is the most important takeaway?"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {question.options.map((option, optionIdx) => (
              <div key={`${question.id}-option-${optionIdx}`} className="space-y-1">
                <Label className="text-xs text-[#8b957b]">Option {optionIdx + 1}</Label>
                <Input
                  value={option}
                  onChange={(e) => updateOption(question.id, optionIdx, e.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Correct Answer</Label>
              <Select
                value={String(question.correctIndex)}
                onValueChange={(value) =>
                  updateQuestion(question.id, { correctIndex: Number(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Correct option" />
                </SelectTrigger>
                <SelectContent>
                  {question.options.map((_, optionIdx) => (
                    <SelectItem key={`${question.id}-correct-${optionIdx}`} value={String(optionIdx)}>
                      Option {optionIdx + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Explanation (optional)</Label>
              <Input
                value={question.explanation ?? ""}
                onChange={(e) => updateQuestion(question.id, { explanation: e.target.value })}
              />
            </div>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={addQuestion}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Question
      </Button>
    </div>
  );
}
