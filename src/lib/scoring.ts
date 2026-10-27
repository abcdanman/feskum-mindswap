import { QuizQuestion } from './types';

export const POINTS = {
  requiredStamp: 10,
  partnerStamp: 5,
  partnerTrail: 10,
  quizPerCorrect: 5,
  vote: 25,
} as const;

export const QUIZ_MAX_QUESTIONS = 2;

export const SCORING_RULES = [
  { label: 'Required faculty stamp', points: POINTS.requiredStamp, detail: 'Counts toward the 8-stamp souvenir.' },
  { label: 'Partner booth stamp', points: POINTS.partnerStamp, detail: 'Optional bonus stop.' },
  { label: 'Partner trail complete', points: POINTS.partnerTrail, detail: 'All active partner booths visited.' },
  { label: 'Quiz answer', points: POINTS.quizPerCorrect, detail: `Per correct answer, max ${QUIZ_MAX_QUESTIONS} per booth.` },
  { label: 'UM Talk vote', points: POINTS.vote, detail: 'One People’s Choice vote.' },
];

export function calculateQuizScore(
  questions: QuizQuestion[],
  answers: Array<number | null>
): { correct: number; total: number; points: number } {
  const total = questions.length;
  const correct = questions.reduce((count, question, index) => {
    return count + (answers[index] === question.correctIndex ? 1 : 0);
  }, 0);
  return { correct, total, points: correct * POINTS.quizPerCorrect };
}

export function isPartnerTrailComplete(
  partnerStamps: Iterable<string>,
  partnerIds: Iterable<string>
): boolean {
  const visited = new Set(partnerStamps);
  const partners = Array.from(new Set(partnerIds));
  return partners.length > 0 && partners.every(id => visited.has(id));
}

export function getLeaderboardScore({
  requiredStamps,
  partnerStamps,
  quizPoints,
  votes,
  partnerTrailComplete,
}: {
  requiredStamps: number;
  partnerStamps: number;
  quizPoints: number;
  votes: number;
  partnerTrailComplete: boolean;
}): number {
  return (
    requiredStamps * POINTS.requiredStamp +
    partnerStamps * POINTS.partnerStamp +
    (partnerTrailComplete ? POINTS.partnerTrail : 0) +
    quizPoints +
    votes * POINTS.vote
  );
}
