import { NextResponse } from "next/server"
import { ask, opposition } from "@/lib/mooneto/cala"
import { analyse, type Answer } from "@/lib/mooneto/classify"
import { standalone } from "@/lib/mooneto/rewrite"
import { read, write } from "@/lib/mooneto/cache"
import { buildPlan, wantsPlan } from "@/lib/mooneto/plan"

export const runtime = "nodejs"
export const maxDuration = 120

export async function POST(request: Request) {
  const started = Date.now()
  try {
    const { question, history = [], gathered = null } = await request.json()
    if (!question?.trim()) {
      return NextResponse.json({ error: "question is required" }, { status: 400 })
    }

    const asked = question.trim()

    // Check the cache before the rewrite: the rewrite itself costs a model call.
    const cached = await read<Answer>(asked, history)
    if (cached) {
      console.log(`[mooneto] cache hit (${Date.now() - started}ms)`)
      return NextResponse.json({ ...cached, asked, cached: true })
    }

    const resolved = await standalone(asked, history)
    if (resolved !== asked) console.log(`[mooneto] rewrote -> ${resolved}`)

    // Ask the question, and in parallel ask who disagrees. Merging both keeps a
    // one-sided source set from producing a falsely settled answer.
    const [found, against] = await Promise.all([ask(resolved), opposition(resolved)])
    if (against) {
      found.claims.push(...against.claims)
      found.countries = [...new Set([...found.countries, ...against.countries])]
      found.laws = [...new Set([...found.laws, ...against.laws])]
    }

    const analysed = await analyse(found)
    // A request for a decision gets a memo, not a claim list.
    // Fold in everything established earlier in the thread, so the memo reasons over the
    // whole case file rather than only the last question's findings.
    const caseFile = gathered
      ? {
          ...analysed,
          laws: [...new Set([...analysed.laws, ...(gathered.laws ?? [])])],
          countries: [
            ...analysed.countries,
            ...(gathered.countries ?? []).filter(
              (c: any) => !analysed.countries.some((k) => k.name === c.name)
            ),
          ],
        }
      : analysed
    const plan = wantsPlan(asked) ? await buildPlan(asked, caseFile) : null
    const answer = { ...analysed, resolved, ...(plan ? { plan, verdict: plan.verdict } : {}) }
    await write(asked, history, answer)
    console.log(`[mooneto] fresh (${Date.now() - started}ms)`)
    return NextResponse.json({ ...answer, asked, resolved, cached: false })
  } catch (error: any) {
    console.error("[mooneto]", error)
    return NextResponse.json({ error: error.message ?? "failed" }, { status: 500 })
  }
}
