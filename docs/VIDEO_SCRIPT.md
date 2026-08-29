# Two-minute demo script

This is the suggested 120-second walkthrough for the submission video. The interface is
in English; the spoken script below is also in English so the legal labels and narration
match. It is intentionally a live walkthrough, not a slide deck.

## Timeline and narration

### 0:00–0:10 — Hook

**On screen:** Open the public URL with the empty Mooneto state visible.

**Say:**

> Space law is full of confident answers and unresolved questions. Mooneto is a visual
> research agent that shows the difference: the answer first, then the provision and
> the jurisdictions behind it.

### 0:10–0:35 — A clear prohibition

**Action:** Ask `Can I own a plot of land on the Moon?`.

**On screen:** Let the Moon route run. Show the red **Prohibited** verdict, then scroll
just far enough to show **The law behind this**, including Outer Space Treaty and Moon
Agreement provisions.

**Say:**

> I ask a normal question. The agent searches Cala, asks for the opposing reading, and
> checks the result against a committed corpus of structured legal provisions. The
> answer is prohibited. Each grounded claim shows the instrument, year and the actual
> provision. Commentary links are not presented as law.

### 0:35–1:00 — A genuinely split issue

**Action:** Ask `But can I keep the resources I extract there?`.

**On screen:** Show the visual route and the generated cartoon scene if it arrives.
Scroll to **Who reads it how** and pause on the flags and the `enables` / `rejects` /
`unclear` stances.

**Say:**

> The follow-up is rewritten with the thread as context, so I do not have to restate
> the Moon. This answer is not flattened into yes or no: the treaty evidence and the
> country positions make the disagreement visible. The flags and names are exact UI
> data, not generated artwork.

### 1:00–1:23 — From research to a decision

**Action:** Ask `Build me the business case for a lunar mining company`.

**On screen:** Show the decision memo: recommended route, legal basis, open risks and
the three confidence components.

**Say:**

> When the question asks for a decision, Mooneto changes format. It turns the case file
> into a memo: where to start, why that route is defensible, what can still change, and
> how much confidence comes from ratification, national law and dissent.

### 1:23–1:47 — Explain the stack

**On screen:** Keep the live result visible; optionally show the repository README in a
second tab for a few seconds.

**Say:**

> Cala is the knowledge layer: it supplies claims, explainability, entities and the
> opposing position. OpenAI rewrites questions and classifies each claim against the
> provision corpus. fal generates a small physical-activity animation while the agent
> thinks; it never carries legal text. The six core instruments are loaded once into
> the repository, so a user request cannot trip Cala's rate limit by refetching them.

### 1:47–2:00 — Close on the submission

**On screen:** Show the public URL, then the GitHub repository. If time permits, show
`entire checkpoint list` in a terminal or README link.

**Say:**

> This is Mooneto: a sourced answer, a visible disagreement and a decision trail. The
> live demo is at `www.ramirozapaia.com/mooneto`, and the full open-source repository,
> setup instructions and API documentation are at `github.com/Zapaia/Hackaton`.

## Recording checklist

- Use the public URL, not a localhost address, in the final recording.
- Start from a clean tab at `https://www.ramirozapaia.com/mooneto`.
- Record at approximately 1440×900 and keep browser chrome minimal.
- Do not show `.env.local`, Vercel settings or API keys.
- Use the exact three questions above so the narrative has a prohibition, a split issue
  and a decision memo.
- If the public cache is cold, allow the Moon route to play; it is part of the product
  story. The answer and video requests run independently.
- For a local rehearsal only, run `pnpm dev` and then `bash scripts/warm.sh`. Do not
  claim that warming the local disk cache warms the production deployment.
- Keep the final cut at or below two minutes. Leave pauses for the verdict, provision
  text and country flags; those are the visual proof points.
