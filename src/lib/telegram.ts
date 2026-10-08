type TelegramApiEnvelope<T> = {
  ok: boolean;
  result?: T;
};

type TelegramSentMessage = {
  message_id: number;
};

export type TelegramInlineButton = { text: string; callback_data: string };

export type SendTelegramMessageOptions = {
  replyToMessageId?: number;
  /** Rows of inline buttons under the message (dispatch offers: Accept / Pass). */
  inlineKeyboard?: TelegramInlineButton[][];
};

function telegramToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
}

export function isTelegramConfigured(): boolean {
  return Boolean(
    telegramToken() &&
      process.env.TELEGRAM_WEBHOOK_SECRET?.trim() &&
      process.env.TELEGRAM_OWNER_USER_ID?.trim() &&
      process.env.TELEGRAM_GROUP_CHAT_ID?.trim(),
  );
}

async function callTelegram<T>(
  method: string,
  body: Record<string, unknown>,
): Promise<T> {
  const token = telegramToken();
  if (!token) throw new Error("Telegram bot token is not configured");

  // TELEGRAM_API_BASE exists only so a local test can stand in for Telegram.
  const apiBase = process.env.TELEGRAM_API_BASE?.trim() || "https://api.telegram.org";
  const response = await fetch(`${apiBase}/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Telegram API request failed with status ${response.status}`);
  }

  const envelope = (await response.json()) as TelegramApiEnvelope<T>;
  if (!envelope.ok || envelope.result === undefined) {
    throw new Error("Telegram API returned an unsuccessful response");
  }
  return envelope.result;
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options: SendTelegramMessageOptions = {},
): Promise<number> {
  const result = await callTelegram<TelegramSentMessage>("sendMessage", {
    chat_id: chatId,
    text: text.slice(0, 4000),
    disable_web_page_preview: true,
    ...(options.replyToMessageId
      ? {
          reply_parameters: {
            message_id: options.replyToMessageId,
            allow_sending_without_reply: true,
          },
        }
      : {}),
    ...(options.inlineKeyboard ? { reply_markup: { inline_keyboard: options.inlineKeyboard } } : {}),
  });

  return result.message_id;
}

/** Acknowledge an inline-button tap (the toast the driver sees). Never throws. */
export async function answerTelegramCallback(callbackQueryId: string, text?: string): Promise<void> {
  try {
    await callTelegram<boolean>("answerCallbackQuery", { callback_query_id: callbackQueryId, ...(text ? { text: text.slice(0, 200), show_alert: false } : {}) });
  } catch (e) {
    console.error("[telegram] answerCallbackQuery failed:", e instanceof Error ? e.message : e);
  }
}

/** Remove the buttons from an offer message once it's been answered or taken. Never throws. */
export async function clearTelegramButtons(chatId: string, messageId: number): Promise<void> {
  try {
    await callTelegram<unknown>("editMessageReplyMarkup", { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } });
  } catch (e) {
    console.error("[telegram] editMessageReplyMarkup failed:", e instanceof Error ? e.message : e);
  }
}

/** The bot's public username for deep links (t.me/<username>?start=…). */
export function telegramBotUsername(): string | null {
  return process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "") || null;
}

/** The owner's private chat with the bot (Telegram user id == private chat id). */
export function telegramOwnerChatId(): string | null {
  return process.env.TELEGRAM_OWNER_USER_ID?.trim() || null;
}
