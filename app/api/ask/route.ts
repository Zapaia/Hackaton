import { NextResponse } from "next/server"
import { ask } from "@/lib/mooneto/cala"
import { analyse } from "@/lib/mooneto/classify"

export const runtime = "nodejs"
export const maxDuration = 120

export async function POST(request: Request) {
  try {
    const { question } = await request.json()
    if (!question?.trim()) {
      return NextResponse.json({ error: "question is required" }, { status: 400 })
    }
    const found = await ask(question.trim())
    return NextResponse.json(await analyse(found))
  } catch (error: any) {
    console.error("[mooneto]", error)
    return NextResponse.json({ error: error.message ?? "failed" }, { status: 500 })
  }
}
