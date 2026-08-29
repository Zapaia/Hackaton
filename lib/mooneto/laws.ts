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
import bundledCorpus from "@/data/corpus.json"
import { read, write } from "./cache"

const API = "https://api.cala.ai"

/**
 * Generated into data/corpus.json by scripts/corpus.ts. It must never be fetched during
 * a user request: six entity lookups at request time rate-limit Cala and leave the
 * classifier with no evidence at all.
 */
export const CORE = [
  // The five UN instruments plus the Accords.
  "Outer Space Treaty",
  "Moon Agreement",
  "Artemis Accords",
  "Rescue Agreement",
  "Liability Convention",
  "Registration Convention",
  // The national statutes that decide almost every commercial question. Looking these up
  // live cost two chained Cala calls each and was most of a two-minute wait; they change
  // about as often as the treaties do, so they belong in the baked corpus.
  // Spelled exactly as Cala holds them: the lookup matches on name, and
  // "Luxembourg Space Resources Law" finds nothing while the genitive does.
  "U.S. Commercial Space Launch Competitiveness Act",
  "Luxembourg's Space Resources Law",
  "Space Resources Act",
]

export type Provision = {
  law: string
  officialTitle?: string
  year?: number
  text: string
  official?: string
}

/**
 * Official depositary texts.
 *
 * Cala attaches no source to `key_provisions`, and the sources it does carry point at
 * secondary commentary — the very thing this product refuses to cite as authority. The
 * citable source for an instrument is the instrument, so these are the depositary pages,
 * each one verified to resolve. An instrument with no verified official text gets no
 * link rather than a guessed one.
 */
const OFFICIAL: Record<string, string> = {
  "outer space treaty":
    "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/outerspacetreaty.html",
  "moon agreement":
    "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/intromoon-agreement.html",
  "liability convention":
    "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introliability-convention.html",
  "rescue agreement":
    "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introrescueagreement.html",
  "registration convention":
    "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introregistration-convention.html",
  "artemis accords": "https://www.nasa.gov/artemis-accords/",
}

function officialText(law: string): string | undefined {
  const key = law.toLowerCase()
  const match = Object.keys(OFFICIAL).find((name) => key.includes(name))
  return match ? OFFICIAL[match] : undefined
}

async function call(path: string, init: RequestInit): Promise<any | null> {
  const key = process.env.CALA_API_KEY
  if (!key) throw new Error("CALA_API_KEY is not set")

  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: { "X-API-KEY": key, "Content-Type": "application/json", ...init.headers },
    })
    if (res.ok) return res.json()
    if (res.status !== 429 && res.status < 500) return null
    await new Promise((r) => setTimeout(r, 2500 * (attempt + 1)))
  }
  return null
}

type LookupOptions = { useCache?: boolean; delayMs?: number }
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Look up one Law entity. The generator can pace calls; runtime extras use the cache. */
export async function lookupLaw(
  name: string,
  { useCache = true, delayMs = 0 }: LookupOptions = {}
): Promise<Provision[] | null> {
  const cacheKey = `law:${name}`
  if (useCache) {
    const cached = await read<Provision[]>(cacheKey)
    if (cached) return cached
  }

  const found = await call(
    `/v1/entities?name=${encodeURIComponent(name)}&entity_types=Law&limit=1`,
    { method: "GET" }
  )
  const entity = found?.entities?.[0]
  if (!entity) return null
  if (delayMs) await pause(delayMs)

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
    official: officialText(entity.name),
  }))
  if (useCache) await write(cacheKey, [], provisions)
  return provisions
}

/** Merge the committed core corpus with cached, sequential lookups for non-core laws. */
export async function corpus(names: string[]): Promise<Provision[]> {
  const core = bundledCorpus as Provision[]
  // A core entity without an articulated provision is still part of the generated
  // corpus scan; do not retry it for every user request.
  const coreNames = new Set(CORE.map((law) => law.toLowerCase()))
  const out = [...core]
  for (const name of names.filter((law) => !coreNames.has(law.toLowerCase()))) {
    try {
      const provisions = await lookupLaw(name)
      if (provisions) out.push(...provisions)
    } catch (error) {
      console.warn(`[laws] lookup failed for ${name}:`, error)
    }
  }
  return out
}
