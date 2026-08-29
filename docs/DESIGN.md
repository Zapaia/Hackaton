# Lex Orbis — Design

> A visual legal advisor for people and businesses that want to operate in space.
> It does not tell you what to do. It tells you **what is settled, what is disputed, and where it is written** — and builds a traceable case file as you explore.

---

## 1. The problem

Space law lives in five treaties from the 1960s and 70s, a handful of national statutes, and a set of non-binding accords. Large parts of it are genuinely unresolved.

Ask a lawyer: expensive and slow. Ask a general chatbot: it answers confidently, sometimes wrongly, and **you cannot tell which parts are settled law and which are open debate.**

In space law, the unresolved parts are exactly where the money and the risk are.

> **The problem: you cannot distinguish "this is settled" from "nobody knows". That distinction is the entire decision.**

The canonical example: you can never own lunar land (Outer Space Treaty, Article II — settled, 110+ parties). But whether you can own what you *extract* from it depends on where your company is incorporated. The US (2015) and Luxembourg (2017) say yes. The Moon Agreement says no. Russia and China reject the Artemis reading.

The answer is not yes or no. It is **under whose flag are you registered.**

## 2. What it does

A single page: a chat on the left, a live visualization on the right.

Every answer is decomposed into individual claims, and each claim is labelled:

| Label | Meaning |
|---|---|
| **Settled** | Backed by a ratified treaty with broad adherence and no major-power dissent |
| **Disputed** | Real legal disagreement — both readings shown, with who holds each |
| **Unsupported** | No verified source found. The system says so instead of inventing |

## 3. The demo (three beats)

**Beat 1 — "Can I own a plot of land on the Moon?"**
Answer: **No.** The Moon renders, surrounded by cards for the treaties that forbid it. Article II is quoted with its source URL.

**Beat 2 — "But can I keep what I extract there?"**
Answer: **Yes and no.** The view splits into flags: states that enable it by national law vs states that reject that reading. A legal-confidence score appears, broken into its components.

**Beat 3 — "Build me the business case."**
A viable route (where to incorporate), the risks that remain open, and a generated illustration of the operation.

Throughout, every step is committed — so the user leaves with a **sourced decision trail**, not a chat log.

## 4. Architecture

```
Question
   │
   ▼
Cala  POST /v1/knowledge/search
   │   → content       markdown answer
   │   → explainability answer split into individual claims + references
   │   → context        real sources with URLs
   │   → entities       typed entities (Law, Company, Place...)
   ▼
Classifier
   │   each claim → settled | disputed | unsupported
   ▼
Country stance resolver
   │   treaty ratification seed + national statutes → per-country position
   ▼
OpenAI
   │   composes the actionable answer
   ▼
UI  (chat + moon + treaty cards + flags + score)
   │
   ▼
Entire
       each answered question is committed → checkpoint carries the full
       reasoning session → `entire search` makes it retrievable as precedent
```

## 5. Partner technology

| Partner | Role | Why it is load-bearing |
|---|---|---|
| **Cala** | Source of verified legal knowledge | `entity_type: "Law"` covers space treaties. `explainability` returns claim-level statements with references — the substrate the whole product classifies |
| **OpenAI** | Reasoning and answer composition | Turns classified claims into an actionable answer |
| **fal** | Visual generation | Treaty cards and the lunar backdrop (pre-generated, cached); the business-case illustration (live) |
| **Entire** | Traceability and precedent | Each answer is a checkpoint carrying its full reasoning session; `entire search` lets the advisor query its own past reasoning |

**Design rule for fal:** anything that carries *information* (treaty names, flags, country identity) is exact UI, never generated. fal is used where the image is *illustrative*. Generated images render text unreliably, are slow, and are non-deterministic — unacceptable for the informational layer of a legal tool.

## 6. The legal-confidence score

Never a magic number. A composite of three visible components, each expandable:

1. **Ratification depth** — how many states are party to the governing treaty
2. **Enabling national law** — does the jurisdiction have a statute permitting it
3. **Major-power dissent** — do China or Russia reject the reading

## 7. Data sources

- **Cala API** — treaties, statutes, cases, entities (primary)
- **Curated seed** — ratification lists for the five UN space treaties plus Artemis Accords signatories. Public, small, and exact; used so country positions are never hallucinated

## 8. Non-goals

No authentication, no database, no user history, no mobile layout. None of it appears in the demo, and all of it costs time that the demo needs.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Cala does not return structured country positions | Curated ratification seed in-repo |
| No Fastino API access at the event | OpenAI performs classification; still four partners |
| Map/visual runs long | Degrade to a coloured country list; the demo still works |

## 10. Schedule (submission 19:00)

| By | Deliverable |
|---|---|
| 14:30 | Cala + classification working, no UI |
| 16:00 | Visualization rendering |
| 17:00 | Entire precedent integration |
| 18:00 | Polish and demo rehearsal |
| 19:00 | **Code frozen at 18:00.** Video, README, API docs |
