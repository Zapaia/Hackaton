# Mooneto API and data flow

This document describes the two server routes used by the browser. Both routes are
implemented in the Next.js App Router and run server-side, so Cala, OpenAI and fal
credentials never reach the client.

## `POST /api/ask`

### Request

```json
{
  "question": "Can I own a plot of land on the Moon?",
  "history": [
    "Q: Can I mine resources on the Moon?",
    "A: It depends on the governing instrument."
  ],
  "gathered": {
    "laws": ["Outer Space Treaty"],
    "countries": []
  }
}
```

`question` is required. `history` and `gathered` are optional and are sent by the UI
for follow-up questions and business-case memos.

### Execution order

1. Validate the question and check the local answer cache.
2. Rewrite the user wording into a standalone legal research question with
   `lib/mooneto/rewrite.ts`. This handles natural follow-ups without a phrase-to-answer
   map.
3. Call Cala's knowledge search for the main reading and an explicit opposing reading.
   `lib/mooneto/cala.ts` parses claims, explainability references, named laws and
   countries.
4. Read the committed `data/corpus.json`. For a non-core Law entity named by Cala,
   `lib/mooneto/laws.ts` performs a sequential, cached lookup for its structured
   `key_provisions`.
5. Send the claims and provisions to OpenAI in JSON mode. The classifier returns labels,
   a one-sentence verdict, tone and country stances.
6. Enforce grounding in TypeScript: a `settled` or `disputed` claim without a cited
   provision is rewritten to `unsupported` in code.
7. If the original question asks for a business case or strategy,
   `lib/mooneto/plan.ts` builds a decision memo from the accumulated case file.
8. Cache and return the answer.

### Response

```json
{
  "asked": "Can I own a plot of land on the Moon?",
  "question": "Can a private person own lunar land under current space law?",
  "resolved": "Can a private person own lunar land under current space law?",
  "verdict": "Individuals cannot own land on the Moon under current space law.",
  "tone": "no",
  "claims": [
    {
      "text": "Outer space is not subject to national appropriation.",
      "label": "settled",
      "why": "Article II directly bars appropriation.",
      "sources": [],
      "provision": {
        "law": "Outer Space Treaty",
        "officialTitle": "Outer Space Treaty",
        "year": 1967,
        "text": "Article II states that outer space, including the Moon and other celestial bodies, is not subject to national appropriation by claim of sovereignty, by means of use or occupation, or by any other means."
      }
    }
  ],
  "countries": [
    { "name": "United States", "stance": "unclear", "why": "Position not established by the material." }
  ],
  "laws": ["Outer Space Treaty", "Moon Agreement"],
  "plan": null,
  "cached": false
}
```

`label` is one of:

- `settled`: an articulated provision states the claim and no corpus provision points
  in the opposite direction.
- `disputed`: the corpus is ambiguous, thinly ratified or contains competing readings.
- `unsupported`: no provision in the corpus establishes the claim.

`provision` is the exact legal evidence shown in the UI. `sources` are retained in the
parsed Cala claim for provenance/debugging, but their blogs and commentary are not
rendered as legal authority. This distinction is deliberate.

When present, `plan` has this shape:

```json
{
  "verdict": "Incorporate in ...",
  "route": [{ "step": "...", "basis": "..." }],
  "risks": [{ "risk": "...", "trigger": "..." }],
  "confidence": {
    "ratification": "...",
    "nationalLaw": "...",
    "dissent": "..."
  }
}
```

## `POST /api/video`

### Request

```json
{ "question": "Can I mine resources on the Moon?" }
```

### Response

```json
{ "url": "https://fal.media/files/...mp4", "cached": false }
```

The route is intentionally independent from `/api/ask`. It selects a minimal physical
activity description, calls `minimax/h3-max/text-to-video` through `@fal-ai/client`,
and caches the returned URL. The current request uses a 5-second, 480P, silent loop.
The UI can display the video as soon as it arrives while the legal route is still
running. If `FAL_KEY` is absent or generation fails, the answer remains usable and the
CSS Moon-and-stars route is shown instead.

fal prompts explicitly prohibit text, logos, flags, faces and legal outcomes. The
generated clip is illustrative motion, never evidence.

## Corpus refresh

`data/corpus.json` is generated intentionally, outside a user request:

```bash
pnpm dlx tsx scripts/corpus.ts
```

The script imports `CORE` from `lib/mooneto/laws.ts`, looks up each of the six core
instrument names once and sequentially, waits between calls to respect Cala's rate
limit, and writes the structured provisions it receives. A missing
`key_provisions` field is recorded by omission; Mooneto never invents text to fill a
gap. Runtime requests read this file and only resolve extra law entities that Cala
names.

## Errors and operational notes

- Empty questions return HTTP `400` with `{ "error": "question is required" }`.
- Upstream failures return HTTP `500` with a user-safe error message.
- Answer and law caches are best-effort disk caches under `.cache/`; they are useful in
  local demos but are ephemeral on serverless deployments.
- API keys are read only in route handlers and server-only helpers. They are not placed
  in `NEXT_PUBLIC_*` variables.
