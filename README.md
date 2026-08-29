# 🌙 Mooneto

**A visual legal advisor for people and businesses that want to operate in space.**

Mooneto does not tell you what to do. It tells you **what is settled, what is disputed, and where it is written** — and it builds a sourced case file as you explore.

> You can never own lunar land. But whether you can own what you *extract* from it depends on where your company is incorporated. The answer isn't yes or no — it's **under whose flag are you registered.**

Built solo at **{Tech: Europe} × Cala — The Summer Lock-In**, Barcelona, 29 August 2026.

---

## The problem

Space law lives in five treaties from the 1960s and 70s, a handful of national statutes, and a set of non-binding accords. Large parts of it are genuinely unresolved.

Ask a lawyer: expensive and slow. Ask a general chatbot: it answers confidently, sometimes wrongly, and **you cannot tell which parts are settled law and which are open debate.**

In space law, the unresolved parts are exactly where the money and the risk are.

> **You cannot distinguish "this is settled" from "nobody knows". That distinction is the entire decision.**

## How it works

Every answer is decomposed into individual claims. Each claim is labelled and sourced:

| Label | Meaning |
|---|---|
| **settled** | Backed by a widely ratified treaty or unambiguous statute, no serious dissent |
| **disputed** | States or scholars genuinely disagree, or the instrument is silent or thinly ratified |
| **unsupported** | No verified source establishes it — Mooneto says so instead of inventing |

Alongside the text, the stage renders the governing instruments and the position of each
country named, so a split answer is visible rather than buried in prose.

## Architecture

```
Question
   │
   ▼
Cala  POST /v1/knowledge/search          lib/mooneto/cala.ts
   │   content         markdown answer
   │   explainability  the answer split into individual claims + references
   │   context         real sources with URLs
   │   entities        typed entities (Law, Country, Organization…)
   ▼
OpenAI  chat/completions (JSON mode)     lib/mooneto/classify.ts
   │   labels every claim settled | disputed | unsupported
   │   resolves each country's stance: enables | rejects | unclear
   │   writes the one-sentence verdict
   ▼
UI                                       app/page.tsx
       chat + moon + treaty cards + country flags
```

The two calls are chained in a single route handler at `app/api/ask/route.ts`.
API keys never reach the browser.

## Partner technology

| Partner | Role | Why it is load-bearing |
|---|---|---|
| **Cala** | Verified legal knowledge | `entity_type: "Law"` covers the space treaties, and `explainability` returns claim-level statements with references — the substrate everything else classifies. Without it the answers would be model recall with no provenance |
| **OpenAI** | Classification and verdict | Turns raw claims into labelled, actionable output |
| **Entire** | Traceability | Every commit carries the full agent session that produced it. `entire search` makes past reasoning retrievable — a precedent base, which is the right metaphor for a legal tool |
| **fal** | Visual generation | Treaty card art and the lunar backdrop |

**Design rule for fal:** anything carrying *information* — treaty names, flags, country
identity — is exact UI, never generated. Generated images render text unreliably and are
non-deterministic, which is unacceptable in the informational layer of a legal tool.
fal is used only where the image is illustrative.

## Setup

Requires Node 20+ and pnpm.

```bash
pnpm install
cp .env.example .env.local     # then fill in your keys
pnpm dev                       # http://localhost:3005
```

### Environment

| Variable | Where to get it | Required |
|---|---|---|
| `CALA_API_KEY` | [console.cala.ai](https://console.cala.ai) | yes |
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com) | yes |
| `OPENAI_MODEL` | defaults to `gpt-4o-mini` | no |

## API

### `POST /api/ask`

```json
{ "question": "Can I own a plot of land on the Moon?" }
```

Response:

```json
{
  "question": "…",
  "verdict": "No — no one can own lunar land under international law.",
  "tone": "no",
  "claims": [
    {
      "text": "The Outer Space Treaty of 1967, Article II, states that outer space…",
      "label": "settled",
      "why": "Ratified by 110+ states, no dissent",
      "sources": [{ "name": "…", "url": "https://…" }]
    }
  ],
  "countries": [{ "name": "United States", "stance": "enables", "why": "…" }],
  "laws": ["Outer Space Treaty", "Artemis Accords"]
}
```

## Stack

Next.js 15 (App Router), React 19, TypeScript. No UI framework and no CSS framework —
the styling is a single hand-written stylesheet, which keeps the bundle small and the
live demo predictable.

## Documentation

- [docs/DESIGN.md](docs/DESIGN.md) — full design: problem, architecture, scope, risks

## Licence

MIT
