# Roadmap — pick up here

Ordered by value. Each item is self-contained: paste the brief into Codex and it can work
without this conversation. Read `docs/STATE.md` first for what already works.

---

## 0. Finish the legal corpus  ·  **do this first**

### What was just built

Claims are no longer judged against Cala's prose. `lib/mooneto/laws.ts` looks up each
`Law` entity Cala names and pulls its `key_provisions` — the articulated rule — and
`lib/mooneto/classify.ts` may only label a claim `settled` or `disputed` if it cites one
of those provisions. **The rule is enforced in code, not in the prompt:** if the model
returns no provision index, the claim is forced to `unsupported`.

The product principle behind it, in the user's words: *"from Cala we take only what is
reliable and jurisdictional. A lawyer relies on that, not on what a blog says."*

Verified working: "Can I own a plot of land on the Moon?" returns 4 settled claims, each
citing Outer Space Treaty Article II or the Artemis Accords, and 8 unsupported — including
the scholarly opinions, which are commentary and not authority. That is correct behaviour.

### The limitation, and the attempt that failed

The corpus is built only from the instruments **that particular query happened to name**.
So a claim about the Moon Agreement comes back `unsupported` whenever the query did not
surface that entity, even though the Moon Agreement is squarely relevant.

The obvious fix — always load the six core instruments — **was tried and reverted**.
Six laws × two Cala calls each, issued per request, trips Cala's rate limit (HTTP 429).
`corpus()` then returns empty, and because the code rule requires a citation, **every
claim collapses to `unsupported`**. All 12 went grey. The constant survives in
`laws.ts` as `CORE`, exported but deliberately not wired in.

> **Codex brief:** The corpus must not be fetched at request time. Write
> `scripts/corpus.ts` that looks up the six instruments in `CORE` (exported from
> `lib/mooneto/laws.ts`) **once**, sequentially, with a delay between calls to respect
> Cala's rate limit, and writes the result to `data/corpus.json`, committed to the repo.
> Then change `corpus()` in `laws.ts` to read that file and merge in any additional law
> the query names (still cached). Verify with "Can I own a plot of land on the Moon?"
> that claims about the Moon Agreement now cite it instead of coming back unsupported,
> and that the settled count does **not** drop to zero. If it drops to zero, the corpus
> failed to load — do not ship that.

## 1. Show the provision instead of the blog link  ·  **highest visible value**

Claims now carry a `provision` object (`law`, `year`, `text`), but `app/page.tsx` still
renders the old `sources` links, which point at blogs like `newspaceeconomy.ca`. The whole
point of item 0 is undone if the UI keeps showing the blog.

> **Codex brief:** In `app/page.tsx`, when a claim has a `provision`, render the provision
> as its evidence — law name, year, and the articulated text — styled distinctly from the
> claim itself. Remove the blog `sources` links from the claim view entirely; they are
> secondary commentary and must not appear as authority. Unsupported claims show no
> evidence and should read as visibly weaker. Use the tokens already in
> `app/globals.css`; do not add a CSS framework.

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
