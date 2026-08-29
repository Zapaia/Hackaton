# Mooneto — roadmap and final checklist

This file is now a completion record rather than an open build brief. Read
[STATE.md](STATE.md) for the verified implementation state.

## Completed roadmap items

### 0. Finish the legal corpus — complete

The six instruments in `CORE` are scanned by `scripts/corpus.ts` once, sequentially,
with a delay between calls. The generated `data/corpus.json` is committed. Runtime
`corpus()` reads that file and only looks up additional non-core laws that Cala names.
This keeps the six-instrument baseline out of the request path and avoids Cala's 429
rate-limit failure.

The required ownership question was verified with a non-zero settled count and a Moon
Agreement citation. Instruments for which Cala exposed no structured
`key_provisions` are omitted rather than invented.

Checkpoint commit: `66e86de feat: commit the core legal corpus to avoid request-time rate limits`.

### 1. Show the provision instead of the blog link — complete

The evidence panel in `app/page.tsx` renders the law name, year, exact provision text
and grounded-claim count. Blog/source URLs are not rendered as authority. Unsupported
claims remain visibly weaker and have no provision box.

Checkpoint commit: `9e110f9 feat: show legal provisions as claim evidence`.

### 2. Render the decision memo — complete

Plan questions render the recommended route, legal basis per step, open risks and the
three confidence components. The memo is derived from the accumulated case file and
country stances. `lib/mooneto/plan.ts` remains unchanged in the submission pass.

Checkpoint commits include `9b9aa04` and `c9a8382`.

### 3. Trim the claim wall — intentionally deferred

The UI keeps the complete claim set available because disputed and unsupported claims
are useful evidence of uncertainty. This is a readability improvement for a later
iteration, not a submission blocker; the primary visual now leads with the verdict,
provisions and jurisdiction panels.

### 4. Integrate fal — complete for the visual track

`app/api/video/route.ts` requests a short MiniMax H3 Max cartoon scene in parallel with
the legal answer. A mining question can show a toy rover; other physical activities
receive a similarly minimal scene. The browser loops the silent clip and falls back to
the CSS constellation when generation is unavailable. Treaty names, flags and legal
outcomes remain exact HTML data.

Relevant checkpoints: `5ddbaef`, `877b9e8`, `b74939c`, `69d7480`.

### 5. Deploy — complete

Mooneto is deployed as its own Vercel project and exposed through the portfolio proxy:

**https://www.ramirozapaia.com/mooneto**

The source remains in [Zapaia/Hackaton](https://github.com/Zapaia/Hackaton). Production
secrets are stored in Vercel and are not committed. Page, asset and `/api/ask` checks
passed after deployment. See [DEPLOYMENT.md](DEPLOYMENT.md).

### 6. Two-minute video — ready to record

The exact narration, actions and timing are in [VIDEO_SCRIPT.md](VIDEO_SCRIPT.md). The
three beats are:

1. ownership of lunar land → prohibited, provision-grounded answer;
2. ownership of extracted resources → split country positions;
3. lunar mining business case → route, risks and confidence memo.

## Final submission checklist

- [x] Public URL works: `https://www.ramirozapaia.com/mooneto`
- [x] Public GitHub repository: `https://github.com/Zapaia/Hackaton`
- [x] README includes setup, environment variables, architecture, API shapes and tool roles
- [x] `docs/API.md` documents `/api/ask`, `/api/video`, corpus refresh and error behavior
- [x] `docs/VIDEO_SCRIPT.md` contains the 2-minute live walkthrough
- [x] `docs/DEPLOYMENT.md` records the Vercel/subpath architecture and verification
- [x] `data/corpus.json` is versioned; core laws are not fetched per request
- [x] API keys remain server-side and are absent from Git
- [x] `pnpm build` and `git diff --check` pass before the documentation commit
- [ ] Record and upload the final ≤2-minute demo video (Loom or equivalent)
- [ ] Submit the demo URL, public repo URL and live URL in the hackathon form

## Do not break before submission

- Do not add runtime fetching of all six core laws.
- Do not replace provision evidence with blogs or generated text.
- Do not put legal facts, treaty names or flags inside fal artwork.
- Do not commit `.env.local`, `.cache/` or Vercel secrets.
- Do not touch `lib/mooneto/plan.ts` or memo rendering during recording prep.
- Keep the final commit pushed so Entire can show the implementation trail.
