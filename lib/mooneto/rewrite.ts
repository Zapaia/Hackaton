/**
 * Turns a conversational follow-up into a self-contained question.
 *
 * Cala answers a question in isolation, so "but can I keep what I extract there?"
 * returns nothing — there is no "there". Rewriting against the conversation so far
 * is what lets the user actually have a conversation.
 */

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini"

const SYSTEM = `Rewrite the user's latest question into a precise, standalone research
question for a space-law knowledge search. Resolve pronouns and references against the
conversation when present. Interpret colloquial grammar and implied context, but preserve
the exact activity, object, location, and requested scope — never invent a new fact.
When the user asks whether an activity is "possible" or "can" be done in this legal
advisor, phrase the question so Cala can retrieve the governing treaties and statutes
as well as practical context. Keep it in the user's language and keep it short.

Return ONLY JSON: {"question":"<rewritten question>"}`

export async function standalone(question: string, history: string[]): Promise<string> {
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
        {
          role: "user",
          content: `Conversation so far:\n${history.join("\n")}\n\nLatest question: ${question}`,
        },
      ],
    }),
  })
  if (!res.ok) return question // never block the answer on the rewrite

  const body = await res.json()
  try {
    return JSON.parse(body.choices[0].message.content).question || question
  } catch {
    return question
  }
}
