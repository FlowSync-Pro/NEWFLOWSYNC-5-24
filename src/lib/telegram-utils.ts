import { timingSafeEqual } from "node:crypto";

export type KnowledgeCandidate = {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
};

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "can", "do", "does", "for", "from", "how",
  "i", "in", "is", "it", "me", "my", "of", "on", "or", "the", "to",
  "what", "when", "where", "who", "why", "with", "you",
]);

export function normalizeTelegramText(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\p{L}\p{N}@?$]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeQuestionForAI(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, "[link removed]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email removed]")
    .replace(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, "[phone removed]")
    .replace(/@\w+/g, "[username removed]")
    .slice(0, 1500);
}

export function telegramTokens(text: string): string[] {
  return normalizeTelegramText(text)
    .split(" ")
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

export function isLikelyFlowSyncQuestion(text: string, botUsername: string): boolean {
  const normalized = normalizeTelegramText(text);
  if (!normalized || normalized.length > 1500) return false;

  const username = botUsername.replace(/^@/, "").toLowerCase();
  if (username && normalized.includes(`@${username}`)) return true;

  const flowSyncTopic =
    /\b(account|checklist|client|community|direct|dot|driver|earn|ein|flowsync|income|lead|llc|login|money|offer|profile|refund|signin|telegram|website)\b/i.test(
      normalized,
    );
  if (!flowSyncTopic) return false;
  if (text.includes("?")) return true;

  return /^(can|could|do|does|how|is|should|what|when|where|who|why|will|would)\b/i.test(
    normalized,
  );
}

export function safeSecretEqual(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

export function scoreKnowledgeCandidate(
  text: string,
  candidate: KnowledgeCandidate,
): number {
  const questionTokens = new Set(telegramTokens(text));
  if (questionTokens.size === 0) return 0;

  const candidateTokens = new Set([
    ...telegramTokens(candidate.question),
    ...candidate.keywords.flatMap(telegramTokens),
  ]);

  let matches = 0;
  for (const token of questionTokens) {
    if (candidateTokens.has(token)) matches += 1;
  }

  const phraseBonus = candidate.keywords.some((keyword) =>
    normalizeTelegramText(text).includes(normalizeTelegramText(keyword)),
  )
    ? 0.35
    : 0;

  return matches / Math.max(questionTokens.size, 1) + phraseBonus;
}

export function rankKnowledgeCandidates(
  text: string,
  candidates: KnowledgeCandidate[],
): Array<KnowledgeCandidate & { score: number }> {
  return candidates
    .map((candidate) => ({
      ...candidate,
      score: scoreKnowledgeCandidate(text, candidate),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function confidentLexicalMatch(
  ranked: Array<KnowledgeCandidate & { score: number }>,
): KnowledgeCandidate | null {
  const first = ranked[0];
  if (!first) return null;
  const second = ranked[1];
  const hasClearLead = !second || first.score - second.score >= 0.2;
  return first.score >= 0.7 && hasClearLead ? first : null;
}

export type OwnerCommand =
  | { type: "save"; escalationId: string }
  | { type: "discard"; escalationId: string }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "status" }
  | { type: "welcome" }
  | null;

export function parseOwnerCommand(text: string): OwnerCommand {
  const normalized = text.trim();
  const withId = normalized.match(/^\/(save|discard)(?:@\w+)?\s+([a-z0-9]+)$/i);
  if (withId) {
    return {
      type: withId[1].toLowerCase() as "save" | "discard",
      escalationId: withId[2],
    };
  }

  const simple = normalized.match(/^\/(pause|resume|status|welcome)(?:@\w+)?$/i);
  if (!simple) return null;
  return {
    type: simple[1].toLowerCase() as "pause" | "resume" | "status" | "welcome",
  };
}
