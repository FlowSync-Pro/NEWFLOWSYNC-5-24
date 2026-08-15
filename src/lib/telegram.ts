type TelegramApiEnvelope<T> = {
  ok: boolean;
  result?: T;
};

type TelegramSentMessage = {
  message_id: number;
};

export type SendTelegramMessageOptions = {
  replyToMessageId?: number;
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

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
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
  });

  return result.message_id;
}

export async function registerTelegramWebhook(webhookUrl: string): Promise<void> {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error("Telegram webhook secret is not configured");

  const registered = await callTelegram<boolean>("setWebhook", {
    url: webhookUrl,
    secret_token: secret,
    allowed_updates: ["message"],
    drop_pending_updates: false,
  });
  if (!registered) throw new Error("Telegram did not register the webhook");
}
