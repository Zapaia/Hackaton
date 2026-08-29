/** Build the committed baseline legal corpus. Run: pnpm dlx tsx scripts/corpus.ts */
import { mkdir, writeFile } from "fs/promises"
import { join } from "path"
import { CORE, lookupLaw, type Provision } from "../lib/mooneto/laws"

const BETWEEN_CALLS_MS = 2_500

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
      console.warn(`[corpus] no structured provisions for ${law}; skipping`)
    } else {
      provisions.push(...found)
    }
    await new Promise((resolve) => setTimeout(resolve, BETWEEN_CALLS_MS))
  }

  const directory = join(process.cwd(), "data")
  const output = join(directory, "corpus.json")
  await mkdir(directory, { recursive: true })
  await writeFile(output, `${JSON.stringify(provisions, null, 2)}\n`)
  console.log(`[corpus] wrote ${provisions.length} provisions to ${output}`)
}

main().catch((error) => {
  console.error("[corpus]", error)
  process.exitCode = 1
})
