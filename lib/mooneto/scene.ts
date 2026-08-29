/**
 * Turns a legal question into a prompt for one small animated scene.
 *
 * Deliberately minimal: flat vector, one subject, one action, no text. Simple scenes
 * generate fast, and a legal tool must never let a generated image carry information —
 * the scene depicts the physical activity only, never the legal outcome.
 */

type Scene = { match: RegExp; subject: string }

const SCENES: Scene[] = [
  {
    match: /\b(min(e|ing)|extract|resource|regolith|drill|ice|water)\b/i,
    subject:
      "one small yellow toy rover slowly scooping a mound of pale dust from the Moon's surface",
  },
  {
    match: /\b(own|land|plot|property|claim|parcel|territor)\b/i,
    subject:
      "a small striped surveyor flag being planted on the Moon, then gently tipping over and lifting away",
  },
  {
    match: /\b(business|company|incorporat|invest|licen[cs]e|permit|register)\b/i,
    subject:
      "a small rocket lifting off from Earth and arriving at the Moon, leaving a simple dotted arc behind it",
  },
  {
    match: /\b(satellite|orbit|launch|debris|collision|spacecraft)\b/i,
    subject: "one small satellite drifting slowly in orbit around a pale planet",
  },
]

const FALLBACK =
  "one small astronaut floating slowly beside a large pale Moon, turning gently"

export function scenePrompt(question: string): string {
  const subject = SCENES.find((s) => s.match.test(question))?.subject ?? FALLBACK
  return [
    "Flat 2D vector cartoon animation, extremely simple, like a looping sticker.",
    `Scene: ${subject}.`,
    "Dark indigo space background with a few tiny dot stars. Limited palette: charcoal, silver, warm yellow.",
    "Heavy clean outlines, solid fills, bold readable silhouettes, gentle two-frame motion.",
    "One locked side view, centered, no camera movement, no cuts, seamless five-second loop.",
    "Hard constraints: no text, no writing, no labels, no flags of countries, no logos, no people's faces,",
    "no realistic textures, no gradients, no 3D rendering, no photorealism, no cinematic lighting.",
    "Depict only the physical activity. Never depict whether it is legal or illegal.",
  ].join(" ")
}
