# Roadmap — pick up here

Ordered by value. Each item is self-contained: paste the brief into Codex and it can work
without this conversation. Read `docs/STATE.md` first for what already works.

---

## 1. Sharpen the business-case memo  ·  **do first**

**Status:** working, but the verdict names a treaty instead of a country.

Beat 3 now returns a real memo (`plan` in the API response) with `route`, `risks` and
`confidence`. The prompt in `lib/mooneto/plan.ts` was just tightened to force the verdict
to name a *state* to incorporate in. **Re-test and confirm it now names a country.**

```bash
rm -rf .cache && bash scripts/warm.sh
```

> **Codex brief:** In `lib/mooneto/plan.ts`, verify the memo verdict names an actual
> country to incorporate in (Luxembourg, United States…), never a treaty. If it still
> names instruments, tighten the system prompt further. Test with
> "Build me the business case for a lunar mining company".

## 2. Render the memo in the UI  ·  **required for the demo**

**Status:** not started. The API returns `plan`, the page ignores it.

`app/page.tsx` renders `verdict` + `claims` only. When `plan` is present it should render
the route, the risks, and the three confidence components instead of a claim list.

> **Codex brief:** In `app/page.tsx`, when an answer has a `plan` field, render it as a
> decision memo: the verdict, then the numbered route with its legal basis per step, then
> the risks, then the three confidence lines. Style with the existing tokens in
> `app/globals.css` — do not add a CSS framework. The claim list should not appear for
> plan answers.

## 3. Trim the wall of claims

**Status:** open. Merging the main query with the opposition query yields ~15 claims,
which is unreadable in the chat panel.

> **Codex brief:** In `app/page.tsx`, cap the rendered claims: show all `disputed` and
> `unsupported` ones (they are the point of the product) but collapse `settled` ones past
> the first three behind a "show N more" toggle.

## 4. Integrate fal  ·  upside, not required

Three partners are already met (Cala, OpenAI, Entire), so this is bonus points.

Order of value: business-case illustration (generated live on beat 3), treaty card art
(pre-generate the five, commit them), lunar backdrop (pre-generate once).

**Design rule that must not be broken:** anything carrying information — treaty names,
flags, country identity — stays exact UI. fal is only for illustration. Generated images
render text unreliably.

> **Codex brief:** Add `lib/mooneto/fal.ts` calling fal's image API with `FAL_KEY` from
> env. Use it only for the business-case illustration on beat 3, and add a script that
> pre-generates the five treaty card images into `public/treaties/`. Never generate flags
> or any image containing text that carries meaning.

## 5. Deploy

Target was `ramirozapaia.com/Mooneto`. Decision: build standalone here, host after.

> **Codex brief:** Deploy this repo to Vercel. Set `CALA_API_KEY` and `OPENAI_API_KEY` as
> environment variables in the Vercel project. Confirm `/api/ask` works in production,
> and note the deployment URL in the README.

## 6. The 2-minute video  ·  **18:00–19:00, no code**

Script is the three beats in order. **Run `bash scripts/warm.sh` first** so every answer
is instant — Cala takes up to 43 seconds cold.

1. Beat 1 — "Can I own a plot of land on the Moon?" → red verdict, treaty cards
2. Beat 2 — "But can I keep the resources I extract there?" → green verdict, flags split
3. Beat 3 — "Build me the business case for a lunar mining company" → the memo
4. Close on Entire: `entire checkpoint list`, showing each decision carries its reasoning

## Do not break

- `.env.local` and `.cache/` stay out of git.
- The three-partner story: **Cala** is the verified source, **OpenAI** classifies,
  **Entire** carries traceability. Do not let any of them become decorative.
- Commit often. Every commit becomes an Entire checkpoint carrying its session — that is
  part of the pitch, not housekeeping.
