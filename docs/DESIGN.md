# Mooneto — product and design notes

## Product thesis

Space-law research is difficult because the answer is often a disagreement between
instruments and jurisdictions, not a single fact. Mooneto makes that uncertainty
legible. The visual scene is the entry point, but the evidence panels are the product:
the user can see what the agent found, what provision supports it and who reads the
issue differently.

Mooneto is a research aid, not a law firm or a legal opinion. It deliberately uses
`unsupported` when the retrieved legal corpus does not establish a claim.

## Experience

The page is a single visual case file:

1. The user submits a natural-language question from the inline ask control.
2. A Moon-and-stars route gives the agent's research work a visible rhythm. The rocket
   visits separated treaty stars and returns to the Moon; stars are seeded per question
   so the layout changes without collisions.
3. A fal-generated physical-activity clip can replace the waiting constellation as soon
   as it arrives. It is muted, loops in place and is never the source of legal meaning.
4. The short verdict lands first, with the original question and any precise rewritten
   reading beneath it.
5. The report follows in normal document flow: treaty provisions on one side and
   jurisdiction positions on the other. There is no overlay window hiding the answer.
6. Strategy questions add a decision memo with route, risks and confidence components.

The layout prioritizes the visual answer over a conventional chat transcript. Follow-up
questions remain available so the user can build a case file without losing context.

## Information hierarchy

The visible order is intentional:

1. **Verdict** — one sentence, one of Prohibited / Permitted / Depends on jurisdiction.
2. **Activity scene** — a visual cue for what is being discussed, never a legal claim.
3. **Treaty evidence** — law, year, articulated provision and grounded-claim count.
4. **Jurisdiction positions** — flag, country, enables/rejects/unclear stance and reason.
5. **Decision memo** — only when the question requests an actionable route.

The UI never displays Cala blog links as if they were primary authority. A claim is
strong only when its `provision` object is present. Unsupported claims are muted and
explain why no evidence is shown.

## Trust boundary

The system has three distinct layers:

| Layer | Source | Allowed to decide |
|---|---|---|
| Retrieval | Cala search, explainability and entities | Which claims, laws and countries are in the case file. |
| Authority | Versioned structured provisions in `data/corpus.json` plus explicitly named extra laws | Whether a claim has legal evidence. |
| Composition | OpenAI classifier and memo path | Labels, verdict wording, country explanations and a route derived from the evidence. |

TypeScript enforces the trust boundary after the model responds: without a cited
provision, `settled` and `disputed` are downgraded to `unsupported`. This keeps a prompt
mistake from becoming an apparent legal fact.

## Visual generation rule

fal is deliberately used for the part that benefits from generative variation: a tiny
cartoon of a rover, a survey flag, a rocket or a satellite performing a physical action.
The prompt forbids text, logos, country flags, faces, treaty names and legal outcomes.
All meaningful labels and data are exact React/HTML/CSS, so an image model can never
invent the information the user is relying on.

## Technical architecture

```text
Question
  ├─ /api/ask
  │    cache → OpenAI standalone rewrite
  │          → Cala main + opposition search
  │          → committed corpus + extra Law lookups
  │          → OpenAI labels, verdict and stances
  │          → optional plan memo
  │
  └─ /api/video
       physical scene prompt → fal MiniMax H3 Max

Answer + optional scene → app/page.tsx → evidence-led visual case file
```

The six baseline instruments are generated once with `scripts/corpus.ts`, not fetched
for every request. Runtime extra-law lookup remains sequential and cached because a
question may name a national statute outside the baseline.

## Design decisions

- **Single page:** preserves the narrative of one question becoming one case file.
- **No CSS framework:** the hand-written stylesheet keeps the visual language small,
  stable and easy to evaluate in a two-minute demo.
- **Deterministic legal UI:** treaty text, country names, flags and statuses must be
  readable and reproducible.
- **Parallel answer/video requests:** slow illustration generation cannot block the
  legal response, and a failed video cannot erase the answer.
- **Graceful degradation:** no `FAL_KEY` or a failed generation returns the CSS route;
  no provision returns a clear unsupported state.
- **Thread-aware follow-ups:** history is rewritten server-side rather than relying on
  hardcoded phrasings such as “mine in the Moon”.

## Accessibility and resilience

The interface uses semantic sections, headings, status roles, visible focus states,
descriptive labels for the video and reduced-motion styles. The report stays in normal
flow on narrow screens. API responses are parsed defensively so an HTML proxy error is
shown as an actionable message instead of a JSON parser stack trace.

## Scope and limitations

This submission optimizes for a compelling, inspectable demo rather than a production
legal service. It has no accounts, database, billing or saved user history. Cala can be
slow or temporarily unavailable; the committed corpus protects the core evidence but
cannot make fresh retrieval instantaneous. Serverless disk caches are best effort.
