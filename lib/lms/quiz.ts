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

export interface QuizOptionPresentation {
  id: string;
  label: string;
  originalIndex: number;
}

export interface QuizQuestionPresentation {
  id: string;
  prompt: string;
  options: QuizOptionPresentation[];
  correctOriginalIndex: number;
  explanation?: string;
}

export interface QuizSession {
  seed: string;
  questions: QuizQuestionPresentation[];
  questionOrder: string[];
  optionOrderByQuestion: Record<string, number[]>;
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

function hashSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}

function seededRandom(seed: number): () => number {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function shuffleWithSeed<T>(values: T[], seed: number): T[] {
  const random = seededRandom(seed);
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createQuizSession(payload: QuizPayload, seedInput: string): QuizSession {
  const normalized = normalizeQuizPayload(payload);
  const baseSeed = hashSeed(seedInput);
  const questionOrder = shuffleWithSeed(
    normalized.questions.map((question) => question.id),
    baseSeed
  );

  const questions = questionOrder
    .map((questionId) => normalized.questions.find((question) => question.id === questionId) ?? null)
    .filter((question): question is QuizQuestion => Boolean(question))
    .map((question, questionIndex) => {
      const optionOrder = shuffleWithSeed(
        question.options.map((_, optionIndex) => optionIndex),
        hashSeed(`${seedInput}:${question.id}:${questionIndex}`)
      );
      const options = optionOrder.map((originalIndex, optionIndex) => ({
        id: `${question.id}:option:${optionIndex}`,
        label: question.options[originalIndex] ?? "",
        originalIndex,
      }));
      return {
        id: question.id,
        prompt: question.prompt,
        options,
        correctOriginalIndex: question.correctIndex,
        explanation: question.explanation,
      };
    });

  const optionOrderByQuestion = questions.reduce<Record<string, number[]>>((acc, question) => {
    acc[question.id] = question.options.map((option) => option.originalIndex);
    return acc;
  }, {});

  return {
    seed: seedInput,
    questions,
    questionOrder,
    optionOrderByQuestion,
  };
}

export function gradeQuizSession(
  session: QuizSession,
  answers: Record<string, string>,
  passThreshold: number
): QuizResult {
  const totalQuestions = session.questions.length;
  if (totalQuestions === 0) {
    return {
      totalQuestions: 0,
      correctAnswers: 0,
      scorePercent: 0,
      passed: false,
    };
  }

  let correctAnswers = 0;
  for (const question of session.questions) {
    const answerOptionId = answers[question.id];
    const selected = question.options.find((option) => option.id === answerOptionId);
    if (!selected) continue;
    if (selected.originalIndex === question.correctOriginalIndex) {
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
