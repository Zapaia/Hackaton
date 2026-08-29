/** Generate one visual experiment for the mining-on-the-Moon legal question. */
import { mkdir, writeFile } from "fs/promises"
import { join } from "path"
import { generateIllustration } from "../lib/mooneto/fal"

const prompt = `
Use case: stylized-concept
Asset type: atmospheric background for a space-law data visualization
Primary request: an autonomous lunar mining rover carefully collecting pale regolith
Scene/backdrop: a vast cratered Moon surface, distant Earth on the horizon, deep black space
Style/medium: elegant editorial 3D illustration, tactile lunar dust, restrained cinematic realism
Composition/framing: wide landscape, rover in the lower right, generous quiet negative space in the upper left for HTML overlay
Lighting/mood: low sun, long blue-grey shadows, calm and contemplative, not dystopian
Color palette: charcoal, graphite, pale lunar silver, subtle earth-blue glow
Constraints: no people, no flags, no logos, no writing, no labels, no signs, no watermark
`

async function main() {
  const url = await generateIllustration(prompt)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not download fal image (${response.status})`)

  const directory = join(process.cwd(), "public", "illustrations")
  const output = join(directory, "lunar-mining.webp")
  await mkdir(directory, { recursive: true })
  await writeFile(output, Buffer.from(await response.arrayBuffer()))
  console.log(`[fal] wrote ${output}`)
}

main().catch((error) => {
  console.error("[fal]", error)
  process.exitCode = 1
})
