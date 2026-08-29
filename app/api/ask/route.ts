import { NextResponse } from "next/server"
import { ask } from "@/lib/mooneto/cala"
import { analyse, type Answer } from "@/lib/mooneto/classify"
import { standalone } from "@/lib/mooneto/rewrite"
import { read, write } from "@/lib/mooneto/cache"

export const runtime = "nodejs"
export const maxDuration = 120

export async function POST(request: Request) {
  const started = Date.now()
  try {
    const { question, history = [] } = await request.json()
    if (!question?.trim()) {
      return NextResponse.json({ error: "question is required" }, { status: 400 })
    }

    const asked = question.trim()
    const resolved = await standalone(asked, history)
    if (resolved !== asked) console.log(`[mooneto] rewrote -> ${resolved}`)

    const cached = await read<Answer>(resolved)
    if (cached) {
      console.log(`[mooneto] cache hit (${Date.now() - started}ms)`)
      return NextResponse.json({ ...cached, asked, resolved, cached: true })
    }

    const answer = await analyse(await ask(resolved))
    await write(resolved, answer)
    console.log(`[mooneto] fresh (${Date.now() - started}ms)`)
    return NextResponse.json({ ...answer, asked, resolved, cached: false })
  } catch (error: any) {
    console.error("[mooneto]", error)
    return NextResponse.json({ error: error.message ?? "failed" }, { status: 500 })
  }
}
