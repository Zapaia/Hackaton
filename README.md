# Mooneto

**Space law, sourced.** Mooneto is a visual legal-research agent for people and
companies planning to operate in space. Ask a question in plain language and it
returns a short answer plus the legal record behind it: what is settled, what is
disputed, which provision supports each claim, and how named jurisdictions read the
issue.

**Live demo:** [www.ramirozapaia.com/mooneto](https://www.ramirozapaia.com/mooneto)

**Source:** [github.com/Zapaia/Hackaton](https://github.com/Zapaia/Hackaton)

Built for **{Tech: Europe} × Cala — The Summer Lock-In**, Barcelona, 29 August 2026.

## Why Mooneto exists

Space-law answers are rarely just yes or no. A general chatbot can blend treaty text,
national law, academic debate and blog commentary into one confident paragraph. That
is dangerous when a founder is deciding whether to invest, incorporate or launch.

Mooneto turns the answer into an inspectable case file:

- Cala retrieves claims, legal instruments, countries and references.
- A versioned corpus contains the structured provisions that may count as authority.
- OpenAI labels every claim `settled`, `disputed` or `unsupported`, and explains the
  country positions.
- The interface puts the verdict first, then shows treaty provisions and jurisdictions
  as the evidence.
- fal supplies a small, silent cartoon scene for the physical activity in the question
  while the legal work is running. It never generates treaty names, flags or legal text.

The product is a research aid, not legal advice. `unsupported` is an intentional result:
when no provision establishes a claim, Mooneto does not turn commentary into authority.

## Product walkthrough

1. Ask a free-form question such as **“Can I own a plot of land on the Moon?”**.
2. The question is rewritten into a precise standalone research question, then Cala is
   queried for the main reading and the opposing reading.
3. The answer stage animates a Moon-and-stars route while the legal calls complete. A
   fal H3 Max clip can replace the waiting constellation when it is ready.
4. The settled/disputed/unsupported verdict appears at the top.
5. **The law behind this** lists the instrument, year, exact structured provision and
   number of claims grounded in it. Blog/source links are deliberately not presented as
   legal authority.
6. **Who reads it how** shows each named country with its stance (`enables`, `rejects`
   or `unclear`) and the reason returned by the classifier.
7. A business-case question produces a decision memo with a route, legal basis, open
   risks and confidence components.

## Architecture

```text
Browser
  ├─ POST /api/ask ───────────────────────────────────────────────┐
  │                                                                │
  │  cache → OpenAI rewrite → Cala search + opposition search      │
  │       → committed provisions + named-law lookups              │
  │       → OpenAI classification / verdict / country stances      │
  │       → optional decision memo                                 │
  │                                                                │
  └─ POST /api/video → scene description → fal MiniMax H3 Max      │
                         (illustration only, no legal meaning)    │
                                                                   ▼
                         app/page.tsx visual case file
```

The six core instruments are **not** fetched at request time. `scripts/corpus.ts`
performs one paced, sequential Cala scan and writes `data/corpus.json`. Runtime
`corpus()` reads that committed file and only looks up an additional `Law` entity when
Cala names one outside the baseline. This avoids the request-time 429 failure that
previously emptied the evidence set.

### Frameworks and tools

| Tool | Use |
|---|---|
| **Next.js 15.5.24 (App Router)** | Full-stack React application and server route handlers. |
| **React 19 + TypeScript** | Interactive case-file UI and typed response models. |
| **Hand-written CSS** | Visual system, responsive layout, reduced-motion support; no CSS framework. |
| **pnpm** | Reproducible local install and build commands. |
| **Vercel** | Production deployment and the `/mooneto` subpath proxy. |
| **GitHub + Entire** | Public source and checkpointed implementation history. |

### Partner roles

| Partner | In Mooneto | Why it matters |
|---|---|---|
| **Cala** | `lib/mooneto/cala.ts` searches claims, explainability, entities and opposing readings. | Supplies the knowledge graph and provenance instead of model-only recall. |
| **OpenAI** | `lib/mooneto/rewrite.ts`, `lib/mooneto/classify.ts`, `lib/mooneto/plan.ts`. | Interprets varied questions, classifies claims and composes the concise answer/memo. |
| **fal** | `lib/mooneto/fal.ts`, `app/api/video/route.ts`. | Generates a short cartoon activity scene while research is in progress. |
| **Entire** | Checkpoint metadata attached to commits. | Preserves the reasoning/session behind each implementation decision. |

### What is exact versus generated

Legal information is deterministic UI: instrument names, years, provision text, flags,
country names, labels and verdicts come from the response data. fal is limited to
atmosphere and physical action (for example, a toy rover scooping lunar dust). It is
explicitly prompted to avoid text, logos, country flags and legal outcomes because
generated imagery is not a reliable authority layer.

## Local setup

Requires **Node.js 20+** and **pnpm**.

```bash
pnpm install
cp .env.example .env.local
# Fill the keys in .env.local, then:
pnpm dev
```

Open [http://localhost:3005](http://localhost:3005).

### Environment variables

| Variable | Required | Purpose |
|---|---:|---|
| `CALA_API_KEY` | yes | Cala knowledge search and Law entity lookups. |
| `OPENAI_API_KEY` | yes | Question rewriting, claim classification and memo generation. |
| `OPENAI_MODEL` | no | OpenAI chat model; defaults to `gpt-4o-mini`. |
| `FAL_KEY` | no* | fal illustration/video generation. *Legal answers still work without it; the video falls back to the CSS constellation. |
| `NEXT_PUBLIC_BASE_PATH` | no | Empty locally; `/mooneto` in the public subpath deployment. |
| `NEXT_PUBLIC_MIN_THINKING_MS` | no | Optional presentation hold for recording; use `0` for a live demo. |
| `NEXT_PUBLIC_MIN_SCENE_MS` | no | Optional minimum scene hold for recording; use `0` for a live demo. |

Never commit `.env.local`, API keys or generated cache files.

### Build and checks

```bash
pnpm build
git diff --check
```

To refresh the committed baseline corpus intentionally (not per request):

```bash
pnpm dlx tsx scripts/corpus.ts
```

The script scans the six names exported as `CORE` sequentially, pauses between calls,
and writes `data/corpus.json`. Review the diff before committing; if Cala does not
expose a structured `key_provisions` value, the instrument is skipped rather than
invented.

For a local recording, `bash scripts/warm.sh` replays the three demo questions into the
answer cache. Cala can take several seconds on a cold query, so warm the cache before
recording if you want a fast walkthrough.

## API reference

### `POST /api/ask`

Request:

```json
{
  "question": "Can I own a plot of land on the Moon?",
  "history": ["Q: ...", "A: ..."],
  "gathered": { "laws": [], "countries": [] }
}
```

Only `question` is required. `history` lets OpenAI resolve follow-ups, and `gathered`
lets a decision memo reason over the case file already established in the thread.

Response shape (abridged):

```json
{
  "question": "Can I own a plot of land on the Moon?",
  "resolved": "Can a private person own lunar land under current space law?",
  "verdict": "Individuals cannot own land on the Moon under current space law.",
  "tone": "no",
  "claims": [
    {
      "text": "Outer space is not subject to national appropriation.",
      "label": "settled",
      "why": "Article II directly bars appropriation.",
      "provision": {
        "law": "Outer Space Treaty",
        "year": 1967,
        "text": "Article II states that outer space... is not subject to national appropriation..."
      }
    }
  ],
  "countries": [
    { "name": "United States", "stance": "unclear", "why": "..." }
  ],
  "laws": ["Outer Space Treaty", "Moon Agreement"],
  "plan": null,
  "cached": false
}
```

`provision` is `null` for unsupported claims. The server enforces that a claim cannot
be `settled` or `disputed` without a cited provision, regardless of what the model
returns. `plan` is present for prompts asking for a business case, strategy,
incorporation or route; it contains `verdict`, `route[]`, `risks[]` and
`confidence.{ratification,nationalLaw,dissent}`.

### `POST /api/video`

Request:

```json
{ "question": "Can I mine resources on the Moon?" }
```

Response:

```json
{ "url": "https://...", "cached": false }
```

The route turns the question into a minimal physical-activity prompt and calls
`minimax/h3-max/text-to-video` at 480P for a 5-second, silent loop. It is independent
from the legal answer and may fail without blocking `/api/ask`; the UI keeps the CSS
constellation as its fallback.

## Deployment

Mooneto remains in this repository and is deployed as a separate Vercel project. The
portfolio project proxies the subpath, so the submission URL is:

**[https://www.ramirozapaia.com/mooneto](https://www.ramirozapaia.com/mooneto)**

The production project is `zapaias-projects/mooneto`. Production secrets are configured
in Vercel; `NEXT_PUBLIC_BASE_PATH=/mooneto` makes Next assets and browser API calls work
behind the proxy. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the exact setup and
verification log.

## Repository map

| Path | Responsibility |
|---|---|
| `app/page.tsx` | Main visual case-file experience, loading route, evidence and jurisdiction panels. |
| `app/api/ask/route.ts` | Orchestrates cache, rewrite, Cala, corpus, classification and optional memo. |
| `app/api/video/route.ts` | Async illustrative video generation and cache. |
| `lib/mooneto/cala.ts` | Cala search, explainability parsing and opposition retrieval. |
| `lib/mooneto/laws.ts` | Provision type, committed corpus merge and extra-law lookup. |
| `lib/mooneto/classify.ts` | OpenAI labels, grounded-provision enforcement and country stances. |
| `lib/mooneto/plan.ts` | Decision memo route, risks and confidence components. |
| `lib/mooneto/fal.ts` | Server-only fal image/video helpers. |
| `lib/mooneto/scene.ts` | Safe illustrative scene descriptions with no legal text. |
| `data/corpus.json` | Versioned structured provisions from the one-time Cala scan. |
| `scripts/corpus.ts` | Deliberately paced corpus refresh script. |
| `scripts/warm.sh` | Optional local demo-cache warmer. |

## Further documentation

- [Design and product rationale](docs/DESIGN.md)
- [API and data-flow notes](docs/API.md)
- [Two-minute demo script](docs/VIDEO_SCRIPT.md)
- [Current verified state](docs/STATE.md)
- [Completed roadmap and submission checklist](docs/ROADMAP.md)
- [Deployment notes](docs/DEPLOYMENT.md)
- [Historical handoff](docs/HANDOFF.md)

## Licence

MIT
