/** Cala client: turns a natural-language legal question into structured claims. */

const API = "https://api.cala.ai"

type Origin = { source?: { name?: string; url?: string }; document?: { name?: string; url?: string } }
type ContextEntry = { id: string; content: string; origins?: Origin[] }
type Explain = { content: string; references?: string[] }
type Entity = { id: string; name: string; entity_type: string }

export type Source = { name: string; url: string }
export type Claim = { text: string; sources: Source[] }
export type CalaResult = {
  question: string
  answer: string
  claims: Claim[]
  countries: string[]
  laws: string[]
}

function sourcesFor(byId: Map<string, ContextEntry>, refs: string[] = []): Source[] {
  const out: Source[] = []
  const seen = new Set<string>()
  for (const ref of refs) {
    for (const origin of byId.get(ref)?.origins ?? []) {
      const doc = origin.document ?? origin.source ?? {}
      if (doc.url && !seen.has(doc.url)) {
        seen.add(doc.url)
        out.push({ name: doc.name ?? doc.url, url: doc.url })
      }
    }
  }
  return out
}

export async function ask(question: string): Promise<CalaResult> {
  const key = process.env.CALA_API_KEY
  if (!key) throw new Error("CALA_API_KEY is not set")

  const res = await fetch(`${API}/v1/knowledge/search`, {
    method: "POST",
    headers: { "X-API-KEY": key, "Content-Type": "application/json" },
    body: JSON.stringify({ input: question }),
  })
  if (!res.ok) throw new Error(`Cala returned ${res.status}`)

  const raw = await res.json()
  const byId = new Map<string, ContextEntry>(
    (raw.context ?? []).map((c: ContextEntry) => [c.id, c])
  )
  const entities: Entity[] = raw.entities ?? []
  const namesOfType = (t: string) =>
    entities.filter((e) => e.entity_type === t).map((e) => e.name)

  return {
    question,
    answer: raw.content ?? "",
    claims: (raw.explainability ?? []).map((e: Explain) => ({
      text: e.content,
      sources: sourcesFor(byId, e.references),
    })),
    countries: namesOfType("Country"),
    laws: namesOfType("Law"),
  }
}
