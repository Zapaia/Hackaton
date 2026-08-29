/**
 * The legal corpus.
 *
 * Cala's prose answer is stitched from whatever it read on the web, which for space law
 * includes blogs. A legal tool cannot present that as authority. So we look up each Law
 * entity Cala names and pull its structured provisions — the actual articulated rule —
 * and that becomes the only evidence the product is allowed to stand on.
 *
 * Entity lookups are rate limited (Cala returns 429), so results are cached on disk and
 * requests are issued one at a time.
 */
import { read, write } from "./cache"

const API = "https://api.cala.ai"

/**
 * The body of space law. Intended to be always-loaded so a claim is not judged
 * unsupported merely because the query did not name its instrument.
 *
 * NOT WIRED IN: loading all six sequentially trips Cala's rate limit and returns an
 * empty corpus, which collapses every claim to "unsupported". See docs/ROADMAP.md item 1.
 */
export const CORE = [
  "Outer Space Treaty",
  "Moon Agreement",
  "Artemis Accords",
  "Rescue Agreement",
  "Liability Convention",
  "Registration Convention",
]

export type Provision = {
  law: string
  officialTitle?: string
  year?: number
  text: string
}

async function call(path: string, init: RequestInit): Promise<any | null> {
  const key = process.env.CALA_API_KEY
  if (!key) throw new Error("CALA_API_KEY is not set")

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: { "X-API-KEY": key, "Content-Type": "application/json", ...init.headers },
    })
    if (res.ok) return res.json()
    if (res.status !== 429 && res.status < 500) return null
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
  }
  return null
}

/** Look up one law and return its provisions, or null if Cala has none. */
async function lookup(name: string): Promise<Provision[] | null> {
  const cacheKey = `law:${name}`
  const cached = await read<Provision[]>(cacheKey)
  if (cached) return cached

  const found = await call(
    `/v1/entities?name=${encodeURIComponent(name)}&entity_types=Law&limit=1`,
    { method: "GET" }
  )
  const entity = found?.entities?.[0]
  if (!entity) return null

  const detail = await call(`/v1/entities/${entity.id}`, {
    method: "POST",
    body: JSON.stringify({
      properties: ["key_provisions", "official_title", "enactment_year"],
    }),
  })
  const props = detail?.properties ?? {}
  const texts: string[] = props.key_provisions?.value ?? []
  if (texts.length === 0) return null

  const provisions = texts.map((text) => ({
    law: entity.name,
    officialTitle: props.official_title?.value,
    year: props.enactment_year?.value,
    text,
  }))
  await write(cacheKey, [], provisions)
  return provisions
}

/** Build the corpus for a set of law names, sequentially to respect the rate limit. */
export async function corpus(names: string[]): Promise<Provision[]> {
  const out: Provision[] = []
  for (const name of names) {
    try {
      const provisions = await lookup(name)
      if (provisions) out.push(...provisions)
    } catch (error) {
      console.warn(`[laws] lookup failed for ${name}:`, error)
    }
  }
  return out
}
