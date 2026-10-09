# Tagged links — where every buyer came from

Since 2026-10-07 the site records a visitor's FIRST link into the site (the tags
below, the referring site, the landing page) and attaches it to their Stripe
payment as metadata: `attr_source`, `attr_medium`, `attr_campaign`,
`attr_content`, `attr_referrer`, `attr_landing`. Open the payment in Stripe →
Metadata to read it. Untagged links still record the referring site (for
example `l.instagram.com`), but only tagged links tell you WHICH post or ad.

## The three tags, and the rule for each

| Tag | Means | Use exactly these values |
|---|---|---|
| `utm_source` | Where the link lives | `meta` (ads), `ig` (Instagram organic), `fb` (Facebook organic), `tiktok`, `email`, `sms`, `telegram`, `youtube` |
| `utm_medium` | What kind of placement | `paid` (ads), `bio`, `reel`, `post`, `story`, `email`, `text`, `group` |
| `utm_campaign` | Which campaign | `verified` (Campaign A), `quiz` (B), `fleet` (C), `retarget` (R), or the email/reel name below |
| `utm_content` | Which ad or link, when a campaign has several | `a1`…`a5`, `b1`…`b3`, `c1`, `c2`, `r1`, `r2`, or `reel1`…`reel5` |

Lowercase, no spaces, never change a value once it is in use (a renamed value
splits your numbers in two). The existing Campaign A–R links in
`meta-ad-copy.md` and `images/README.md` stay valid; the links below add
`utm_medium` and `utm_content` so each ad is told apart.

## Meta ads (paste as the ad's Website URL)

Campaign A — Verified listing, landing `/pricing`:

```
https://flowsyncdriver.com/pricing?utm_source=meta&utm_medium=paid&utm_campaign=verified&utm_content=a1
https://flowsyncdriver.com/pricing?utm_source=meta&utm_medium=paid&utm_campaign=verified&utm_content=a2
https://flowsyncdriver.com/pricing?utm_source=meta&utm_medium=paid&utm_campaign=verified&utm_content=a3
https://flowsyncdriver.com/pricing?utm_source=meta&utm_medium=paid&utm_campaign=verified&utm_content=a4
https://flowsyncdriver.com/pricing?utm_source=meta&utm_medium=paid&utm_campaign=verified&utm_content=a5
```

Campaign B — Load-rate quiz, landing `/tools/earnings`:

```
https://flowsyncdriver.com/tools/earnings?utm_source=meta&utm_medium=paid&utm_campaign=quiz&utm_content=b1
https://flowsyncdriver.com/tools/earnings?utm_source=meta&utm_medium=paid&utm_campaign=quiz&utm_content=b2
https://flowsyncdriver.com/tools/earnings?utm_source=meta&utm_medium=paid&utm_campaign=quiz&utm_content=b3
```

Campaign C — Curri fleet, landing the homepage fleet section (tags go BEFORE the `#`):

```
https://flowsyncdriver.com/?utm_source=meta&utm_medium=paid&utm_campaign=fleet&utm_content=c1#curri-fleet
https://flowsyncdriver.com/?utm_source=meta&utm_medium=paid&utm_campaign=fleet&utm_content=c2#curri-fleet
```

Campaign R — Retargeting, landing `/pricing`:

```
https://flowsyncdriver.com/pricing?utm_source=meta&utm_medium=paid&utm_campaign=retarget&utm_content=r1
https://flowsyncdriver.com/pricing?utm_source=meta&utm_medium=paid&utm_campaign=retarget&utm_content=r2
```

Meta adds its own click id (`fbclid`) to every ad click automatically; the site
records that too, and passes it back to Meta so Ads Manager credits the right ad.

## Instagram / Facebook / TikTok organic

One link in the bio (change it when the pinned offer changes):

```
https://flowsyncdriver.com/pricing?utm_source=ig&utm_medium=bio&utm_campaign=verified
https://flowsyncdriver.com/pricing?utm_source=fb&utm_medium=bio&utm_campaign=verified
https://flowsyncdriver.com/pricing?utm_source=tiktok&utm_medium=bio&utm_campaign=verified
```

Reels (the spoken URL can't carry tags, so put the tagged link in the caption
and the bio, and say "link in bio"):

```
https://flowsyncdriver.com/?utm_source=ig&utm_medium=reel&utm_campaign=fleet&utm_content=reel1#curri-fleet
https://flowsyncdriver.com/pricing?utm_source=ig&utm_medium=reel&utm_campaign=verified&utm_content=reel2
https://flowsyncdriver.com/pricing?utm_source=ig&utm_medium=reel&utm_campaign=verified&utm_content=reel3
https://flowsyncdriver.com/tools/earnings?utm_source=ig&utm_medium=reel&utm_campaign=quiz&utm_content=reel4
https://flowsyncdriver.com/pricing?utm_source=ig&utm_medium=reel&utm_campaign=verified&utm_content=reel5
```

For TikTok swap `utm_source=ig` for `utm_source=tiktok`; for a Facebook post use
`utm_source=fb&utm_medium=post`; for a story `utm_medium=story`.

## Texts you send by hand (recovery, follow-ups)

```
https://flowsyncdriver.com/pricing?utm_source=sms&utm_medium=text&utm_campaign=recovery
https://flowsyncdriver.com/pricing?utm_source=sms&utm_medium=text&utm_campaign=followup
```

## Telegram (fleet group, community)

```
https://flowsyncdriver.com/pricing?utm_source=telegram&utm_medium=group&utm_campaign=verified
https://flowsyncdriver.com/?utm_source=telegram&utm_medium=group&utm_campaign=fleet#curri-fleet
```

## Emails

Every email the site sends tags its own links automatically (`lib/email.ts`
→ `tagEmailLinks` in `lib/attribution.ts`): `utm_source=email`,
`utm_medium=email`, and `utm_campaign` set to the email's name — `welcome`,
`purchase-confirmation`, `premium-welcome`, `fleet-welcome`, `approved`,
`review-invite`, `booking`, the follow-up kinds (`m1-offer-closing`,
`m1b-fleet-offer-closing`, `m2-finish-setup`, `m3-first-week`, the win-back,
`add-city-2026-10`), and the quiz emails (`quiz-breakdown`, `quiz-l1`…`quiz-l3`). Only links into our own site are tagged; Telegram,
Stripe, unsubscribe and password-reset links are left alone. Nothing to do
by hand. For an email you write yourself:

```
https://flowsyncdriver.com/pricing?utm_source=email&utm_medium=email&utm_campaign=manual
```

## Reading the results

- **Per sale:** Stripe → Payments → the payment → Metadata.
- **Per campaign:** Meta Ads Manager (Purchases column, breakdown by Placement
  for Facebook vs Instagram). The site's metadata is the tie-breaker when Meta
  and your gut disagree.
- A sale with no `attr_*` fields came from a visitor who first arrived before
  2026-10-07, or with cookies blocked, or typed the address directly.
