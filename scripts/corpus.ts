/** Build the committed baseline legal corpus. Run: pnpm dlx tsx scripts/corpus.ts */
import { mkdir, writeFile } from "fs/promises"
import { join } from "path"
import { CORE, lookupLaw, type Provision } from "../lib/mooneto/laws"

const BETWEEN_CALLS_MS = 6_000

async function main() {
  const provisions: Provision[] = []
  for (const law of CORE) {
    console.log(`[corpus] looking up ${law}`)
    // This is the one controlled refresh: no runtime cache, strictly sequential calls.
    const found = await lookupLaw(law, { useCache: false, delayMs: BETWEEN_CALLS_MS })
    if (!found?.length) {
      // Cala currently has no structured provision for every core instrument. Keep the
      // scan complete and record the instruments it can articulate; never manufacture a
      // provision merely to fill the dataset.
      // Distinguish the two: an instrument Cala cannot articulate is a fact about the
      // data, a rate-limited call is a fact about the run. Reporting both the same way
      // hid several statutes that do have provisions.
      console.warn(
        `[corpus] nothing returned for ${law} — either Cala has no structured provision ` +
          `or the call was throttled. Re-run and compare before trusting this.`
      )
    } else {
      provisions.push(...found)
    }
    await new Promise((resolve) => setTimeout(resolve, BETWEEN_CALLS_MS))
  }

  // Aliases in CORE can resolve to the same entity, so keep one copy of each provision.
  const seen = new Set<string>()
  const unique = provisions.filter((provision) => {
    const key = `${provision.law}::${provision.text}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const directory = join(process.cwd(), "data")
  const output = join(directory, "corpus.json")
  await mkdir(directory, { recursive: true })
  await writeFile(output, `${JSON.stringify(unique, null, 2)}\n`)
  console.log(`[corpus] wrote ${unique.length} provisions to ${output}`)
}

main().catch((error) => {
  console.error("[corpus]", error)
  process.exitCode = 1
})
