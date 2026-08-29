import { mkdir, writeFile } from "fs/promises"
import { join } from "path"
import { generateCartoonActivity } from "../lib/mooneto/fal"

export const PROMPT = `
Use case: stylized-concept.
Asset type: a tiny five-second source loop for a space-law research interface, shown while an AI agent investigates a question. The interface may play it at a faster rate or loop it behind the answer.
Primary request: create an extremely simple, charming 2D cartoon micro-animation of one small autonomous lunar rover scooping the Moon’s surface.
Scene: one oversized round grey Moon fills most of the frame against a solid dark-indigo space background with four or five tiny dot stars. Treat the scene like a small looping sticker or a children’s science app icon.
Subject: exactly one friendly toy-like lunar rover, built from simple rounded rectangles and circles, with two chunky wheels, one tiny antenna, and one obvious scoop arm. Use a bold readable silhouette that works at thumbnail size.
Action and timing: one seamless five-second loop, one locked shot, no cuts. From 0–1.2 seconds the rover rolls a little; from 1.2–2.8 seconds it lowers the scoop; from 2.8–4 seconds it scoops one small mound of pale dust; from 4–5 seconds it lifts the scoop and returns to the starting pose. Use broad, easy-to-read motion and a tiny two-frame dust puff; no intricate physics.
Camera and composition: fixed side view, centered composition, full Moon and rover always visible, generous negative space, no camera movement, no zoom, no shake.
Visual language: pure flat 2D vector cartoon, limited color palette, solid fills, clean heavy dark outlines, deliberately simplified shapes, subtle squash-and-stretch, gentle two-frame animation, playful and friendly like a looping educational sticker. Moon colors are charcoal and silver; rover accents are warm yellow; space is dark indigo.
Hard constraints: exactly one Moon and one rover; no people; no flags; no country symbols; no treaty symbols; no logos; no writing; no labels; no UI; no watermark; no explosions; no realistic textures; no gradients; no glossy 3D rendering; no photorealism; no cinematic lighting; no live action; no extra vehicles; no scene changes.
The result must communicate only the physical action of a rover scooping lunar dust. It must not communicate whether the activity is legal or illegal; the legal answer is rendered separately as exact interface text.
`

async function main() {
  const url = await generateCartoonActivity(PROMPT, { duration: 5 })
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not download fal video (${response.status})`)
  const directory = join(process.cwd(), "public", "illustrations")
  const output = join(directory, "lunar-mining-h3-cartoon-refined.mp4")
  await mkdir(directory, { recursive: true })
  await writeFile(output, Buffer.from(await response.arrayBuffer()))
  console.log(`[fal] wrote ${output}`)
}

main().catch((error) => {
  console.error("[fal]", error)
  process.exitCode = 1
})
