import { NextResponse } from "next/server"
import { generateCartoonActivity } from "@/lib/mooneto/fal"
import { read, write } from "@/lib/mooneto/cache"
import { scenePrompt } from "@/lib/mooneto/scene"

export const runtime = "nodejs"
export const maxDuration = 300

/**
 * Generated separately from the answer on purpose.
 *
 * The legal reading must land immediately; the animation arrives when it is ready and
 * fills the stage that was already holding its place. Blocking the answer on video
 * generation would make the whole product feel as slow as its slowest part.
 */
export async function POST(request: Request) {
  try {
    const { question } = await request.json()
    if (!question?.trim()) {
      return NextResponse.json({ error: "question is required" }, { status: 400 })
    }
    const asked = question.trim()

    const cached = await read<{ url: string }>(`video:${asked}`)
    if (cached) return NextResponse.json({ ...cached, cached: true })

    const started = Date.now()
    const url = await generateCartoonActivity(scenePrompt(asked), { duration: 5 })
    console.log(`[video] generated in ${((Date.now() - started) / 1000).toFixed(1)}s`)

    await write(`video:${asked}`, [], { url })
    return NextResponse.json({ url, cached: false })
  } catch (error: any) {
    console.error("[video]", error)
    return NextResponse.json({ error: error.message ?? "failed" }, { status: 500 })
  }
}
