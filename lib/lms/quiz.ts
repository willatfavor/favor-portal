export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface QuizPayload {
  title?: string;
  questions: QuizQuestion[];
}

export interface QuizResult {
  totalQuestions: number;
  correctAnswers: number;
  scorePercent: number;
  passed: boolean;
}

export function createEmptyQuizQuestion(index = 1): QuizQuestion {
  return {
    id: `q-${Date.now()}-${index}`,
    prompt: "",
    options: ["", "", "", ""],
    correctIndex: 0,
  };
}

export function createEmptyQuizPayload(): QuizPayload {
  return {
    title: "",
    questions: [createEmptyQuizQuestion(1)],
  };
}

export function normalizeQuizPayload(value: unknown): QuizPayload {
  if (!value || typeof value !== "object") return createEmptyQuizPayload();

  const candidate = value as { title?: unknown; questions?: unknown };
  const questions = Array.isArray(candidate.questions) ? candidate.questions : [];

  const normalizedQuestions = questions
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const row = item as {
        id?: unknown;
        prompt?: unknown;
        options?: unknown;
        correctIndex?: unknown;
        explanation?: unknown;
      };
      const optionsRaw = Array.isArray(row.options) ? row.options : [];
      const options = optionsRaw
        .slice(0, 6)
        .map((option) => (typeof option === "string" ? option : ""));
      while (options.length < 2) options.push("");
      const correctIndex =
        typeof row.correctIndex === "number" &&
        Number.isFinite(row.correctIndex) &&
        row.correctIndex >= 0 &&
        row.correctIndex < options.length
          ? row.correctIndex
          : 0;

      return {
        id: typeof row.id === "string" ? row.id : `q-${Date.now()}-${index + 1}`,
        prompt: typeof row.prompt === "string" ? row.prompt : "",
        options,
        correctIndex,
        explanation: typeof row.explanation === "string" ? row.explanation : undefined,
      } as QuizQuestion;
    })
    .filter((row): row is QuizQuestion => Boolean(row));

  return {
    title: typeof candidate.title === "string" ? candidate.title : "",
    questions: normalizedQuestions.length > 0 ? normalizedQuestions : [createEmptyQuizQuestion(1)],
  };
}

export function isQuizPayloadReady(payload: QuizPayload): boolean {
  if (payload.questions.length === 0) return false;
  return payload.questions.every((q) => {
    const hasPrompt = q.prompt.trim().length > 0;
    const filledOptions = q.options.filter((option) => option.trim().length > 0);
    return hasPrompt && filledOptions.length >= 2;
  });
}

export function gradeQuiz(
  payload: QuizPayload,
  answers: Record<string, number>,
  passThreshold: number
): QuizResult {
  const totalQuestions = payload.questions.length;
  if (totalQuestions === 0) {
    return {
      totalQuestions: 0,
      correctAnswers: 0,
      scorePercent: 0,
      passed: false,
    };
  }

  let correctAnswers = 0;
  for (const question of payload.questions) {
    if (answers[question.id] === question.correctIndex) {
      correctAnswers += 1;
    }
  }

  const scorePercent = Math.round((correctAnswers / totalQuestions) * 100);
  return {
    totalQuestions,
    correctAnswers,
    scorePercent,
    passed: scorePercent >= passThreshold,
  };
}
