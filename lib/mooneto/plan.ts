/**
 * Business-case mode.
 *
 * Some questions are not requests for a fact but for a decision: "build me the business
 * case", "where should I incorporate", "is this viable". Answering those with a list of
 * labelled claims misses the point — the user wants a route, its legal basis, and the
 * risks that stay open. This composes that from the whole thread.
 */
import type { Answer } from "./classify"

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini"

const SYSTEM = `You are a space-law analyst writing a short decision memo for a founder.

You are given the legal findings gathered so far in this conversation. Use ONLY those
findings. Never introduce a treaty, statute or country that does not appear in them.

Produce:
- "verdict": one sentence naming the recommended COUNTRY to incorporate in, and why.
  It must name a state (for example "Luxembourg" or "the United States"), never a treaty.
  Treaties are not jurisdictions. If no country in the findings enables the activity,
  say so plainly instead of naming one.
- "route": 2-4 concrete steps the founder should take, in order. Each step names the
  legal instrument that makes it possible.
- "risks": 2-4 open legal risks. Each names what is unresolved and what would change it.
- "confidence": {"ratification":"...","nationalLaw":"...","dissent":"..."} — one short
  line each on how widely the governing treaty is ratified, whether enabling national
  law exists, and whether a major power dissents.

Return ONLY JSON:
{"verdict":"...","route":[{"step":"...","basis":"..."}],
 "risks":[{"risk":"...","trigger":"..."}],
 "confidence":{"ratification":"...","nationalLaw":"...","dissent":"..."}}`

export type Plan = {
  verdict: string
  route: { step: string; basis: string }[]
  risks: { risk: string; trigger: string }[]
  confidence: { ratification: string; nationalLaw: string; dissent: string }
}

/** Heuristic: is the user asking for a decision rather than a fact? */
export function wantsPlan(question: string): boolean {
  return /business case|should i|where (do|should)|incorporate|viable|plan|strategy|roadmap|set up|register my/i.test(
    question
  )
}

export async function buildPlan(question: string, gathered: Answer): Promise<Plan | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null

  const findings = [
    ...gathered.claims.map((c) => `- [${c.label}] ${c.text}`),
    ...gathered.countries.map((c) => `- ${c.name}: ${c.stance} (${c.why})`),
    `- Instruments in play: ${gathered.laws.join(", ")}`,
  ].join("\n")

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Request: ${question}\n\nFindings:\n${findings}` },
      ],
    }),
  })
  if (!res.ok) {
    console.warn(`[plan] OpenAI returned ${res.status}: ${await res.text()}`)
    return null
  }

  try {
    return JSON.parse((await res.json()).choices[0].message.content)
  } catch (error) {
    console.warn("[plan] could not parse plan:", error)
    return null
  }
}
