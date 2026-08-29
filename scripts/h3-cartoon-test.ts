import { mkdir, writeFile } from "fs/promises"
import { join } from "path"
import { generateCartoonActivity } from "../lib/mooneto/fal"

export const PROMPT = `
Use case: stylized-concept.
Asset type: a tiny looping visual for a space-law research interface, shown while an AI agent investigates a question.
Primary request: create a simple, charming 2D cartoon micro-animation of one small autonomous lunar rover mining the Moon.
Scene: a small round grey Moon in deep navy space, a few tiny soft stars, no Earth, no other planets, no background clutter.
Subject: one friendly box-shaped lunar rover with two chunky wheels, a tiny antenna, and one clear mechanical scoop arm; simple geometric silhouette, readable at small UI size.
Action and timing: one continuous five-second shot, no cuts. From 0–1.2 seconds the rover rolls slowly from left toward the center. From 1.2–2.8 seconds its scoop arm gently lowers into the ground. From 2.8–3.8 seconds the scoop lifts a small mound of pale lunar dust. From 3.8–5 seconds the rover pauses, raises the scoop, and a small soft puff of dust settles. Keep the motion slow, obvious, and physically simple.
Camera and composition: locked-off side view, centered wide composition, the Moon and rover fully visible, generous empty space around them, no camera shake, no zoom, no cuts.
Style and mood: flat 2D cartoon illustration, hand-drawn children’s science animation, clean thick outlines, muted charcoal and silver Moon, warm yellow rover details, dark indigo space, gentle and playful but precise.
Constraints: exactly one rover and one Moon; no people; no flags; no country symbols; no treaty symbols; no logos; no writing; no labels; no UI; no watermark; no explosions; no photorealism; no cinematic live-action; no extra vehicles; no scene changes.
The result must communicate only the physical action of a rover scooping lunar dust. It must not communicate whether the activity is legal or illegal; the legal answer is rendered separately as exact interface text.
`

async function main() {
  const url = await generateCartoonActivity(PROMPT)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not download fal video (${response.status})`)
  const directory = join(process.cwd(), "public", "illustrations")
  const output = join(directory, "lunar-mining-h3-cartoon.mp4")
  await mkdir(directory, { recursive: true })
  await writeFile(output, Buffer.from(await response.arrayBuffer()))
  console.log(`[fal] wrote ${output}`)
}

main().catch((error) => {
  console.error("[fal]", error)
  process.exitCode = 1
})
