TASK SPEC: Keep one private load card for Nasser in the "Curri Dispatch" bot (follow-up)

Context
- The first task (CURSOR-TASK-PORTAL-BOT.md) is already done: the bot posts every new
  portal load and every "left the feed" to FlowSync's intake door, and no longer messages
  drivers. Keep all of that exactly as it is.
- Owner decision: Nasser still wants the bot's detailed card in HIS private Telegram chat
  as a heads-up. If the first task removed it, bring it back — private chat only.

Goal
- For each new load, after posting it to FlowSync, send ONE message to Nasser's private
  chat with the Curri Dispatch bot (his Telegram user id — not a group, not drivers):

    📥 NEW LOAD DETECTED — <del_ id>
    📍 Pickup: <full pickup address>
    📍 Dropoff: <full dropoff address>
    💰 Pay: $<pay>   🛣️ ~<miles> mi   📈 $<rate>/mi
    🚚 Vehicle: <vehicle>   📦 <accessories / priority>
    🔗 <portal link>
    FlowSync is offering it to Active drivers — claim only after
    "✅ … ACCEPTED — CLAIM NOW" from the FlowSync bot.

- Optional: when a load leaves the feed, one line to the same private chat:
  "⌛ <del_ id> left the feed." (FlowSync already handles the drivers.)

Scope (files you may touch)
- Only the portal bot's own code. Nothing in the FlowSync site repo.

Do-NOT
- Do not send the card to any group or to any driver.
- Do not include: "Claim on Curri portal, then /dispatch … @driver", "Sent to N
  available drivers", "Available drivers in radius", "NO available drivers matched — no one
  was notified", "If we secure this load, you'll see it under Deliveries…" (driver-facing
  text), or "/rules — unassigning after assignment = $25 / removal".
- Do not bring back /on, /end, /dispatch or any driver commands.
- Do not change how the bot posts to FlowSync, and do not click anything in the portal.

Approval needed?
- No FlowSync change. Nasser approves the bot change.

Done looks like
- Per new portal load, Nasser's phone shows two messages: this private card (from Curri
  Dispatch) and FlowSync's "Offered to N Active drivers … / NOT COVERED" ping, then
  FlowSync's "✅ … ACCEPTED — CLAIM NOW" when a driver accepts.
- Drivers receive nothing from Curri Dispatch; only FlowSync's Accept / Pass offers.
