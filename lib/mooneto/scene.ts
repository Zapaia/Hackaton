/**
 * Turns a legal question into a prompt for one small animated scene.
 *
 * What the question is physically about is a language problem, so the model answers it.
 * A fixed pattern table was tried and removed: it could not span the questions people
 * actually ask, and "I want to build a hotel on the Moon" fell straight through it to a
 * floating astronaut.
 *
 * The house style below is not negotiable, whoever wrote the subject. A legal tool must
 * never let a generated image carry information, so the scene depicts the physical
 * activity only — never the legal outcome, and never text.
 */

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini"

const SYSTEM = `You describe one tiny animated scene for a space-law tool.

Given a question, name the PHYSICAL ACTIVITY it is about and where it happens, as one
short clause an animator could draw. Nothing else.

Rules:
- Get the celestial body right. Mars is rust-red, the Moon is pale grey, asteroids are
  dark rock, Earth orbit shows the blue curve of Earth below. If the question names a
  place, use that place.
- Describe an action, not a concept. "A small dome habitat being assembled on the pale
  grey lunar surface" is good. "A legal question about property" is not.
- One subject only, toy-like and simple, drawable in flat 2D vector with heavy outlines.
- Never depict the legal outcome, courts, documents, contracts, national flags, faces,
  or any text.

Return ONLY JSON: {"scene":"<one short clause>","setting":"<the surface or space around it>"}`

/** The house style every scene is rendered in. */
function render(subject: string, setting: string): string {
  return [
    "Flat 2D vector cartoon animation, extremely simple, like a looping sticker.",
    `Scene: ${subject}.`,
    `Setting: ${setting}.`,
    "Heavy clean outlines, solid fills, bold readable silhouettes, gentle two-frame motion.",
    "One locked side view, centered, no camera movement, no cuts, seamless five-second loop.",
    "Hard constraints: no text, no writing, no labels, no national flags, no logos, no faces,",
    "no realistic textures, no gradients, no 3D rendering, no photorealism, no cinematic lighting.",
    "Depict only the physical activity. Never depict whether it is legal or illegal.",
  ].join(" ")
}

export async function describeScene(question: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error("OPENAI_API_KEY is not set")

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: question },
      ],
    }),
  })
  if (!res.ok) throw new Error(`Scene description failed (${res.status})`)

  const drafted = JSON.parse((await res.json()).choices[0].message.content)
  if (!drafted.scene) throw new Error("Scene description came back empty")
  return render(drafted.scene, drafted.setting ?? "dark space with a few tiny dot stars")
}
