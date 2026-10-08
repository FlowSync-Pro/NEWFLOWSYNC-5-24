TASK SPEC: Feed the "Curri Dispatch" portal bot into the FlowSync dispatch board

Goal
- The portal bot keeps watching the Curri carrier portal feed, but stops dispatching
  drivers itself. For every new load it POSTs to FlowSync's intake door; for every load
  that leaves the feed it POSTs a "gone" event. FlowSync then offers the load to Active
  drivers on Telegram, and pings Nasser "CLAIM NOW" once a driver accepts.

Scope (files you may touch)
- Only the portal bot's own code (its repo/project). Nothing in the FlowSync site repo.

The door
- POST https://flowsyncdriver.com/api/dispatch/intake
- Header: Authorization: Bearer <DISPATCH_INTAKE_KEY>   (Nasser gives you the key;
  store it as an environment variable in the bot, never in code or a commit)
- Header: Content-Type: application/json
- New load body, and the "gone" body: see docs/DISPATCH-INTAKE.md in the FlowSync repo,
  section "The portal-feed bot". Use the del_… id as curriRef.

Do-NOT
- Do not claim, bid, assign, or click anything in the Curri portal. Read only.
- Do not message drivers. Remove /on, /end, /dispatch … @driver, and the
  "Sent to N available drivers" output. Drivers use the FlowSync bot (/active, /inactive).
- Do not tell Nasser to "claim on portal, then dispatch". He claims only after FlowSync's
  "✅ … ACCEPTED — CLAIM NOW" message.
- Do not show or enforce a "$25 / removal" fee — it is not in the fleet terms.
- Do not post loads older than the bot's start time; post each load once (the door is
  idempotent on curriRef anyway).

Approval needed?
- Nasser approves the change to the bot and sets DISPATCH_INTAKE_KEY in the bot's
  environment. No FlowSync code change is needed — the door already accepts this.

Done looks like
- A new portal load produces, within seconds: a FlowSync ping to Nasser ("Offered to N
  Active drivers …" or "NOT COVERED"), and Accept/Pass offers on matching drivers' phones
  from the FlowSync bot — and nothing from the portal bot to drivers.
- A load that disappears from the feed before anyone accepts is cancelled on the
  FlowSync board, and drivers holding that offer get "Gone".
- The bot logs each POST's HTTP status; 401 means the key is wrong, 422 shows the reason.
