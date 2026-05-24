export interface GameState {
  monthlyGoal: number;
  earnings: number;
  jobs: number;
  streak: number;
  bestStreak: number;
  lastLogDate: string; // YYYY-MM-DD
  weeks: number[]; // last 4 weeks earnings, index 3 = current week
}

const KEY = "flowsync.gameState";

export const SEED_STATE: GameState = {
  monthlyGoal: 4000,
  earnings: 2760,
  jobs: 32,
  streak: 5,
  bestStreak: 9,
  lastLogDate: "",
  weeks: [780, 910, 640, 430],
};

export function loadGame(): GameState {
  if (typeof window === "undefined") return SEED_STATE;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return SEED_STATE;
  try {
    return { ...SEED_STATE, ...(JSON.parse(raw) as GameState) };
  } catch {
    return SEED_STATE;
  }
}

export function saveGame(state: GameState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

export function resetGame() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Apply a logged job to the state (immutably). */
export function logJob(state: GameState, amount: number): GameState {
  const today = todayKey();
  let { streak, bestStreak } = state;
  if (state.lastLogDate !== today) {
    streak = streak + 1;
    bestStreak = Math.max(bestStreak, streak);
  }
  const weeks = [...state.weeks];
  weeks[weeks.length - 1] += amount;
  return {
    ...state,
    earnings: state.earnings + amount,
    jobs: state.jobs + 1,
    streak,
    bestStreak,
    lastLogDate: today,
    weeks,
  };
}

export interface Tier {
  name: string;
  minJobs: number;
  perk: string;
}

export const TIERS: Tier[] = [
  { name: "Rookie", minJobs: 0, perk: "Listed in the directory" },
  { name: "Pro", minJobs: 25, perk: "Pro badge on your profile" },
  { name: "Elite", minJobs: 100, perk: "Priority placement in search" },
  { name: "Legend", minJobs: 250, perk: "Featured driver + lowest fees" },
];

export function currentTier(jobs: number): { tier: Tier; next?: Tier } {
  let idx = 0;
  for (let i = 0; i < TIERS.length; i++) {
    if (jobs >= TIERS[i].minJobs) idx = i;
  }
  return { tier: TIERS[idx], next: TIERS[idx + 1] };
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: "flag" | "ten" | "target" | "half" | "almost" | "trophy" | "flame" | "century";
  unlocked: (s: GameState) => boolean;
}

export const BADGES: Badge[] = [
  { id: "first", name: "First Mile", description: "Log your first job", icon: "flag", unlocked: (s) => s.jobs >= 1 },
  { id: "ten", name: "Perfect 10", description: "Complete 10 jobs", icon: "ten", unlocked: (s) => s.jobs >= 10 },
  { id: "quarter", name: "Quarter Way", description: "Reach 25% of your goal", icon: "target", unlocked: (s) => s.earnings >= s.monthlyGoal * 0.25 },
  { id: "half", name: "Halfway Hero", description: "Reach 50% of your goal", icon: "half", unlocked: (s) => s.earnings >= s.monthlyGoal * 0.5 },
  { id: "almost", name: "Almost There", description: "Reach 75% of your goal", icon: "almost", unlocked: (s) => s.earnings >= s.monthlyGoal * 0.75 },
  { id: "goal", name: "Goal Crusher", description: "Hit 100% of your monthly goal", icon: "trophy", unlocked: (s) => s.earnings >= s.monthlyGoal },
  { id: "streak", name: "On Fire", description: "Reach a 7-day streak", icon: "flame", unlocked: (s) => s.bestStreak >= 7 },
  { id: "century", name: "Century Club", description: "Complete 100 jobs", icon: "century", unlocked: (s) => s.jobs >= 100 },
];

export function unlockedIds(s: GameState): Set<string> {
  return new Set(BADGES.filter((b) => b.unlocked(s)).map((b) => b.id));
}
