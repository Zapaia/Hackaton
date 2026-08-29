# State — updated 2026-08-29, mid-build

Submission is due **19:00**. Code freezes at **18:00**; the last hour is video + docs.

## Working and verified

| Piece | Status |
|---|---|
| Next.js app, chat + stage layout | ✅ verified in browser at 1440×900 |
| Cala client with 5xx retry | ✅ `lib/mooneto/cala.ts` |
| Adversarial retrieval (asks who disagrees, merges) | ✅ produces a real split |
| Follow-up rewriting against thread history | ✅ `lib/mooneto/rewrite.ts` |
| OpenAI classifier: settled / disputed / unsupported | ✅ `lib/mooneto/classify.ts` |
| Country stances: enables / rejects / unclear | ✅ US, LU, JP, AE enable; RU rejects |
| Disk cache keyed on question + history | ✅ replays the whole script in 0.3s |
| Entire capturing sessions per commit | ✅ 2 checkpoints pushed to origin |

**Beat 1** ("Can I own a plot of land on the Moon?") — verified end to end in the browser.
Red verdict, 5 settled claims with real source links, 2 treaty cards, US flag.

**Beat 2** ("But can I keep the resources I extract there?") — verified. Green verdict,
5 treaty cards, flags split across enables / rejects / unclear.

## Evidence is now restricted to legal instruments

`lib/mooneto/laws.ts` pulls the articulated provisions of every Law entity Cala names, and
a claim may only be labelled `settled` or `disputed` if it cites one — enforced in code.
Scholarly commentary and blog-sourced statements fall to `unsupported`, which is the
correct and intended behaviour.

**Known limitation:** the corpus covers only the instruments a given query named. Always
loading the six core treaties was tried and reverted — it trips Cala's rate limit and
collapses every claim to unsupported. See ROADMAP item 0 for the fix.

## Open work, in priority order

### ~~1. Beat 3~~ — DONE

Beat 3 now returns a decision memo: a verdict naming a country to incorporate in, a
numbered route with the legal basis per step, open risks with their triggers, and three
confidence components. The national-law and dissent lines are **derived from the country
stances in the case file**, not written by the model — it was claiming no major power
dissents while the findings listed Russia as rejecting.

Verified in the browser: all three beats run end to end, and the flags render split
(United States enables; Russia, China, India reject).

### 1. Superseded — original note kept below for context
"Build me the business case for a lunar mining company" currently returns another
Q&A answer ("The legality of lunar mining is currently disputed among states").
It does **not** build a business case.

It should produce: a recommended jurisdiction to incorporate in, the legal basis for
that recommendation, and the risks that stay open. This is the payoff of the whole demo
and it is the difference between a lookup tool and the case-file product we pitched.

Likely shape: a second prompt path in `classify.ts` that, when the question asks for a
plan rather than a fact, composes a recommendation from the accumulated thread instead
of a claim list.

### 2. Fifteen claims is a wall of text
Merging the main query with the opposition query doubles the claims. The chat panel
becomes unreadable. Options: group by label, collapse the agreeing ones, or cap at the
strongest N per label.

### 3. fal is not integrated at all
Planned uses, in order of value: the business-case illustration (live), treaty card art
(pre-generated, cached in repo), lunar backdrop (pre-generated). Not required to hit the
three-partner minimum — Cala, OpenAI and Entire already do that — so this is upside.

### 4. Hosting
Target was `ramirozapaia.com/Mooneto`. Decision taken: build here, host later. A Vercel
deploy of this repo is the straightforward path; the portfolio can rewrite to it.

### 5. The 2-minute video
The script is the three beats, in order, with the cache warm so every answer is instant.

## Known issues

- **Cala latency is wildly variable**: 3s to 43s for the same class of query, plus
  intermittent 502s. Mitigated by retry + cache. Always run `scripts/warm.sh` before
  demoing or recording.
- **Classification is not perfectly stable**: the Artemis Accords claim came back
  `settled` on one run and `disputed` on another. Temperature is already 0.
- Automated browser clicks against the dev server are flaky before hydration; this is a
  test-tooling annoyance, not a product bug.

## Run it

```bash
pnpm dev                  # http://localhost:3005
bash scripts/warm.sh      # pre-warm the demo answers
```
