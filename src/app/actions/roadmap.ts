"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { parseProgress, todayKey, type RoadmapProgress } from "@/lib/roadmap";

async function loadProgress(userId: string): Promise<RoadmapProgress> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { roadmapData: true } });
  return parseProgress(user?.roadmapData);
}

async function saveProgress(userId: string, progress: RoadmapProgress): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { roadmapData: progress as unknown as Prisma.InputJsonValue },
  });
  revalidatePath("/account");
}

/** Toggle a launch-checklist or milestone task on/off. */
export async function toggleTask(taskId: string): Promise<{ ok: boolean }> {
  const session = await getSession();
  if (!session) return { ok: false };
  if (!taskId) return { ok: false };

  const progress = await loadProgress(session.userId);
  const has = progress.tasks.includes(taskId);
  progress.tasks = has ? progress.tasks.filter((t) => t !== taskId) : [...progress.tasks, taskId];
  await saveProgress(session.userId, progress);
  return { ok: true };
}

/** Mark today done — logs a daily check-in for the streak (idempotent per day). */
export async function checkInToday(): Promise<{ ok: boolean }> {
  const session = await getSession();
  if (!session) return { ok: false };

  const progress = await loadProgress(session.userId);
  const today = todayKey();
  if (!progress.days.includes(today)) {
    // Keep the log bounded (a year of dates is plenty for streak math).
    progress.days = [...progress.days, today].slice(-400);
    await saveProgress(session.userId, progress);
  }
  return { ok: true };
}
