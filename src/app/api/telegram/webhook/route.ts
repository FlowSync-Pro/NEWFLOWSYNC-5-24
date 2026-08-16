import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isTelegramConfigured } from "@/lib/telegram";
import {
  processTelegramUpdate,
  type TelegramUpdate,
} from "@/lib/telegram-bot";
import { safeSecretEqual } from "@/lib/telegram-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_WEBHOOK_BYTES = 64 * 1024;

function validUpdate(value: unknown): value is TelegramUpdate {
  if (!value || typeof value !== "object") return false;
  const updateId = (value as { update_id?: unknown }).update_id;
  return typeof updateId === "number" && Number.isSafeInteger(updateId);
}

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!secret || !isTelegramConfigured()) {
    return new NextResponse("Telegram bot is not configured", { status: 503 });
  }

  const receivedSecret =
    request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!safeSecretEqual(receivedSecret, secret)) {
    return new NextResponse("Invalid webhook secret", { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_WEBHOOK_BYTES) {
    return new NextResponse("Payload too large", { status: 413 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_WEBHOOK_BYTES) {
    return new NextResponse("Payload too large", { status: 413 });
  }

  let update: unknown;
  try {
    update = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }
  if (!validUpdate(update)) {
    return new NextResponse("Invalid Telegram update", { status: 400 });
  }

  const updateId = String(update.update_id);
  const chatId = update.message?.chat?.id;
  const userId = update.message?.from?.id;
  const existing = await prisma.telegramProcessedUpdate.findUnique({
    where: { updateId },
  });

  if (existing?.status === "COMPLETED") {
    return NextResponse.json({ received: true, duplicate: true });
  }
  if (
    existing?.status === "RECEIVED" &&
    Date.now() - existing.updatedAt.getTime() < 60_000
  ) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (existing) {
    await prisma.telegramProcessedUpdate.update({
      where: { updateId },
      data: {
        status: "RECEIVED",
        attempts: { increment: 1 },
        chatId: chatId === undefined ? null : String(chatId),
        userId: userId === undefined ? null : String(userId),
      },
    });
  } else {
    await prisma.telegramProcessedUpdate.create({
      data: {
        updateId,
        chatId: chatId === undefined ? null : String(chatId),
        userId: userId === undefined ? null : String(userId),
      },
    });
  }

  try {
    await processTelegramUpdate(update);
    await prisma.telegramProcessedUpdate.update({
      where: { updateId },
      data: { status: "COMPLETED" },
    });
    return NextResponse.json({ received: true });
  } catch {
    await prisma.telegramProcessedUpdate.update({
      where: { updateId },
      data: { status: "FAILED" },
    });
    console.error("Telegram update processing failed");
    return new NextResponse("Telegram processing failed", { status: 500 });
  }
}
