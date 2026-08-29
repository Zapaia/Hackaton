# Mooneto — current state

Updated **29 August 2026** for final submission. The product is in demo-ready state;
remaining work is recording and submitting the links, not feature construction.

## Submission links

- **Public demo:** https://www.ramirozapaia.com/mooneto
- **Public source:** https://github.com/Zapaia/Hackaton
- **Standalone Vercel project:** `zapaias-projects/mooneto`

The portfolio repository remains separate. It proxies `/mooneto` to the Mooneto Vercel
deployment, so the source, corpus and assets stay in this repository.

## Implemented and verified

| Area | Current state |
|---|---|
| Visual product | Moon-centered case file with a clear verdict, treaty evidence, country stances and follow-up questions. |
| Free-form questions | OpenAI rewrites varied wording into a standalone space-law query; no phrase-to-answer map. |
| Cala retrieval | Main and opposing searches run in parallel; claims, explainability, laws and countries are parsed. |
| Legal corpus | `scripts/corpus.ts` scanned all six `CORE` names once, sequentially with pauses; `data/corpus.json` is committed and read at runtime. |
| Grounding | Only claims with a cited structured provision can remain `settled` or `disputed`; otherwise code forces `unsupported`. |
| Evidence UI | Provision law, year and text are shown directly. Blog/commentary links are not shown as authority. |
| Jurisdiction UI | Countries are ordered by `enables`, `rejects`, `unclear`, with flag, stance and reason visible. |
| Decision memo | Business/strategy prompts render route, legal basis, open risks and ratification/national-law/dissent confidence. |
| Visual generation | fal `minimax/h3-max/text-to-video` can generate a short cartoon activity scene in parallel with `/api/ask`; CSS constellation is the fallback. |
| Traceability | Commits are pushed to `origin/main` and captured as Entire checkpoints. |
| Deployment | Public page, assets and `/mooneto/api/ask` have been verified with HTTP 200. |

## Required legal-corpus verification

The required question was run after the corpus change:

`Can I own a plot of land on the Moon?`

The live result had a non-zero settled count and included a claim citing **Moon
Agreement (1979)**. The public deployment check recorded three settled claims and a
Moon Agreement citation. If a future run returns zero instruments or every claim is
unsupported, treat it as a retrieval failure and do not present that run as a demo.

## Runtime flow

1. Check the answer cache.
2. Rewrite the question with OpenAI, preserving the user's language and thread context.
3. Search Cala for the main reading and explicitly for opposition.
4. Merge the committed corpus with any extra Law entity Cala names.
5. Classify claims and country stances with OpenAI, enforcing provision grounding in
   TypeScript.
6. Build a decision memo only when the question asks for a plan or business route.
7. In parallel, request an illustrative fal scene; render it when ready without blocking
   the legal response.

## Known limitations (acceptable for the submission)

- Cala latency varies substantially on a cold request. The UI keeps the answer and video
  requests independent, and `scripts/warm.sh` is available for local rehearsal.
- `.cache/` is a best-effort disk cache. It is useful locally but should be considered
  ephemeral on Vercel serverless instances.
- The visual scene selector is intentionally conservative and illustrative. It chooses
  a physical activity description; it never decides the legal verdict or draws legal
  facts into generated pixels.
- MiniMax H3 Max currently requires a 5–15 second duration. Mooneto requests the lowest
  valid duration and loops the silent clip in the browser.
- The committed corpus contains structured provisions Cala exposed for Outer Space
  Treaty (1967), Moon Agreement (1979) and Artemis Accords (2020). Rescue, Liability
  and Registration were scanned but omitted when Cala returned no structured
  `key_provisions`; no text was fabricated.

## Local commands

```bash
pnpm install
cp .env.example .env.local
pnpm dev                  # http://localhost:3005
pnpm build
bash scripts/warm.sh     # optional local rehearsal cache
```

See [docs/VIDEO_SCRIPT.md](VIDEO_SCRIPT.md) for the exact two-minute walkthrough and
[docs/DEPLOYMENT.md](DEPLOYMENT.md) for production configuration.
