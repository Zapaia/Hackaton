/** Labels each Cala claim as settled / disputed / unsupported and resolves country stances. */
import type { CalaResult, Claim } from "./cala"
import type { Provision } from "./laws"

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini"

const SYSTEM = `You are a space-law analyst. You never invent law.

You are given a CORPUS of legal provisions — the articulated text of the treaties and
statutes in play. That corpus is the only authority you may rely on. Secondary commentary
is not authority, however plausible it sounds.

For each numbered claim, assign exactly one label:

- "settled": a provision in the corpus states it, and no other provision contradicts it.
- "disputed": provisions in the corpus point in different directions, OR a provision is
  silent or ambiguous on the point, OR the governing instrument lacks broad ratification.
- "unsupported": NO provision in the corpus establishes it. Use this whenever the claim
  rests only on commentary. This is not a failure — saying so is the product.

Set "provision" to the index of the corpus provision that carries the claim, or null when
the label is "unsupported". A claim labelled settled or disputed MUST cite a provision.

Also, for every country named in the material, give its stance on the specific
activity the user asked about:
  "enables" - its national law or signed position permits it
  "rejects" - it opposes that reading
  "unclear" - named but position not established by the material

Return ONLY JSON:
{"claims":[{"index":0,"label":"settled","provision":0,"why":"<max 12 words>"}],
 "countries":[{"name":"United States","stance":"enables","why":"<max 12 words>"}],
 "verdict":"<one sentence, plain language, answering the user's question>",
 "tone":"no|yes|split"}

"tone" describes the bottom line: "no" if the activity is prohibited, "yes" if clearly
permitted, "split" if it depends on jurisdiction or is unresolved.`

export type Label = "settled" | "disputed" | "unsupported"
export type Stance = "enables" | "rejects" | "unclear"

export type LabelledClaim = Claim & {
  label: Label
  why: string
  provision?: Provision | null
}
export type CountryStance = { name: string; stance: Stance; why: string }
export type Answer = {
  question: string
  verdict: string
  tone: "no" | "yes" | "split"
  claims: LabelledClaim[]
  countries: CountryStance[]
  laws: string[]
}

/**
 * Which state enacted which statute.
 *
 * A national law belongs to its state — that is a fact, not an inference. The two columns
 * are filled from different places (instruments come from the corpus, states from Cala's
 * entities), so a run could show a US statute granting a right while the United States was
 * missing from the list of states that allow it. This closes that gap and nothing else.
 */
const ENACTED_BY: Array<{ match: RegExp; state: string }> = [
  { match: /commercial space launch competitiveness/i, state: "United States" },
  { match: /luxembourg/i, state: "Luxembourg" },
]

export async function analyse(found: CalaResult, corpus: Provision[] = []): Promise<Answer> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error("OPENAI_API_KEY is not set")

  const numbered = found.claims.map((c, i) => `[${i}] ${c.text}`).join("\n")
  const provisions = corpus
    .map((p, i) => `[${i}] ${p.law}${p.year ? ` (${p.year})` : ""}: ${p.text}`)
    .join("\n")

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content:
            `Question: ${found.question}\n\n` +
            `CORPUS of legal provisions (the only authority):\n${provisions || "(empty)"}\n\n` +
            `Claims to label:\n${numbered}\n\n` +
            `Countries named: ${found.countries.join(", ") || "none"}`,
        },
      ],
    }),
  })
  if (!res.ok) throw new Error(`OpenAI returned ${res.status}`)

  const body = await res.json()
  const verdict = JSON.parse(body.choices[0].message.content)

  const labels = new Map<number, { label: Label; why: string; provision?: number | null }>(
    (verdict.claims ?? []).map((c: any) => [
      c.index,
      { label: c.label, why: c.why, provision: c.provision },
    ])
  )

  const claims = found.claims.map((c, i) => {
    const verdictFor = labels.get(i)
    const cited =
      typeof verdictFor?.provision === "number" ? corpus[verdictFor.provision] : null
    // Enforced in code, not left to the prompt: no provision, no standing.
    const label: Label = cited ? verdictFor!.label : "unsupported"
    return { ...c, label, why: verdictFor?.why ?? "", provision: cited ?? null }
  })
  const laws = [...new Set([
    ...found.laws,
    ...claims.flatMap((claim) => claim.provision?.law ? [claim.provision.law] : []),
  ])]

  return {
    question: found.question,
    verdict: verdict.verdict ?? "",
    tone: verdict.tone ?? "split",
    claims,
    countries: withEnactingStates(verdict.countries ?? [], found.laws),
    laws,
  }
}

/** Add the state behind any cited national statute, when it is not already listed. */
function withEnactingStates(countries: CountryStance[], laws: string[]): CountryStance[] {
  const listed = new Set(countries.map((c) => c.name.toLowerCase()))
  const added: CountryStance[] = []

  for (const law of laws) {
    const owner = ENACTED_BY.find((entry) => entry.match.test(law))
    if (!owner || listed.has(owner.state.toLowerCase())) continue
    listed.add(owner.state.toLowerCase())
    added.push({ name: owner.state, stance: "enables", why: `Its own law: ${law}.` })
  }
  return [...added, ...countries]
}
