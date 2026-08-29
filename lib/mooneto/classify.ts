/** Labels each Cala claim as settled / disputed / unsupported and resolves country stances. */
import type { CalaResult, Claim } from "./cala"

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini"

const SYSTEM = `You are a space-law analyst. You never invent law.

For each numbered claim you receive, assign exactly one label:

- "settled": backed by a widely ratified treaty or an unambiguous statute, with no
  serious dissent among spacefaring states.
- "disputed": states or scholars genuinely disagree, OR a treaty is silent or ambiguous
  on the point, OR the governing instrument lacks broad ratification.
- "unsupported": the claim carries no source, or the source does not establish it.

Also, for every country named in the material, give its stance on the specific
activity the user asked about:
  "enables" - its national law or signed position permits it
  "rejects" - it opposes that reading
  "unclear" - named but position not established by the material

Return ONLY JSON:
{"claims":[{"index":0,"label":"settled","why":"<max 12 words>"}],
 "countries":[{"name":"United States","stance":"enables","why":"<max 12 words>"}],
 "verdict":"<one sentence, plain language, answering the user's question>",
 "tone":"no|yes|split"}

"tone" describes the bottom line: "no" if the activity is prohibited, "yes" if clearly
permitted, "split" if it depends on jurisdiction or is unresolved.`

export type Label = "settled" | "disputed" | "unsupported"
export type Stance = "enables" | "rejects" | "unclear"

export type LabelledClaim = Claim & { label: Label; why: string }
export type CountryStance = { name: string; stance: Stance; why: string }
export type Answer = {
  question: string
  verdict: string
  tone: "no" | "yes" | "split"
  claims: LabelledClaim[]
  countries: CountryStance[]
  laws: string[]
}

export async function analyse(found: CalaResult): Promise<Answer> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error("OPENAI_API_KEY is not set")

  const numbered = found.claims.map((c, i) => `[${i}] ${c.text}`).join("\n")
  const unsourced = found.claims
    .map((c, i) => (c.sources.length ? null : i))
    .filter((i) => i !== null)

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
            `Claims:\n${numbered}\n\n` +
            `Countries named: ${found.countries.join(", ") || "none"}\n` +
            `Claims with no source attached: ${unsourced.length ? unsourced.join(", ") : "none"}`,
        },
      ],
    }),
  })
  if (!res.ok) throw new Error(`OpenAI returned ${res.status}`)

  const body = await res.json()
  const verdict = JSON.parse(body.choices[0].message.content)

  const labels = new Map<number, { label: Label; why: string }>(
    (verdict.claims ?? []).map((c: any) => [c.index, { label: c.label, why: c.why }])
  )

  return {
    question: found.question,
    verdict: verdict.verdict ?? "",
    tone: verdict.tone ?? "split",
    claims: found.claims.map((c, i) => ({
      ...c,
      label: labels.get(i)?.label ?? "unsupported",
      why: labels.get(i)?.why ?? "",
    })),
    countries: verdict.countries ?? [],
    laws: found.laws,
  }
}
