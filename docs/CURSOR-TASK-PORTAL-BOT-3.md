TASK SPEC: Add a once-a-minute "tick" to the "Curri Dispatch" bot (follow-up 3)

Context
- Tasks 1 and 2 (CURSOR-TASK-PORTAL-BOT.md, -2.md) are done: the bot posts each new portal
  load and each "left the feed" to FlowSync's intake door, and sends Nasser one private
  card per load. Keep all of that exactly as it is.
- FlowSync can now tell Nasser "⌛ NO TAKER — don't claim" when an offer window closes with
  nobody accepting. It checks whenever something calls the site. In quiet stretches nothing
  does, so the ping can be late. The bot already runs all day, so it can knock once a
  minute. Free — no new service.

Goal
- Once every 60 seconds, while the bot is running, send:

    POST https://flowsyncdriver.com/api/dispatch/sweep
    Authorization: Bearer <DISPATCH_INTAKE_KEY>   (the same key the bot already uses)
    (no body)

- Expect `{"ok":true,"noTaker":N}`. Log only when N > 0 or on an error. FlowSync sends
  the Telegram ping itself — the bot sends nothing to anyone for this.

Scope (files you may touch)
- Only the portal bot's own code. Nothing in the FlowSync site repo.

Do-NOT
- Do not call more often than once a minute, and do not retry a failed tick (the next
  minute is the retry).
- Do not print the key in logs.
- Do not message drivers, groups or Nasser for this; do not click anything in the portal.
- Do not change how the bot posts loads or "gone" events.

Approval needed?
- No FlowSync change. Nasser approves the bot change.

Done looks like
- Fly logs show no errors from the tick. An offer that nobody accepts produces FlowSync's
  "⌛ NO TAKER …" message on Nasser's phone within about a minute of the window closing.
- A 401 means the key on Fly doesn't match Vercel; a 503 means Vercel has no key set.
