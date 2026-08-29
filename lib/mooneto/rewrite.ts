/**
 * Turns a conversational follow-up into a self-contained question.
 *
 * Cala answers a question in isolation, so "but can I keep what I extract there?"
 * returns nothing — there is no "there". Rewriting against the conversation so far
 * is what lets the user actually have a conversation.
 */

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini"

const SYSTEM = `Rewrite the user's latest question so it stands alone, resolving every
pronoun and reference against the conversation. Keep it in the user's language and
keep it short. Preserve the legal subject matter exactly — never broaden or narrow it.

If the question already stands alone, return it unchanged.

Return ONLY JSON: {"question":"<rewritten question>"}`

export async function standalone(question: string, history: string[]): Promise<string> {
  if (history.length === 0) return question

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
