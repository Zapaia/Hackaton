"use client"

import { useState } from "react"

type Source = { name: string; url: string }
type Claim = { text: string; sources: Source[]; label: string; why: string }
type Country = { name: string; stance: string; why: string }
type Answer = {
  question: string
  verdict: string
  tone: string
  claims: Claim[]
  countries: Country[]
  laws: string[]
}

const SUGGESTIONS = [
  "Can I own a plot of land on the Moon?",
  "But can I keep the resources I extract there?",
  "Build me the business case for a lunar mining company",
]

/** Country name -> regional indicator flag. Falls back to a globe. */
const ISO: Record<string, string> = {
  "United States": "US", "United States of America": "US", "Russian Federation": "RU",
  Russia: "RU", China: "CN", Luxembourg: "LU", Japan: "JP", Australia: "AU",
  Canada: "CA", "New Zealand": "NZ", "United Kingdom": "GB", India: "IN",
  France: "FR", Germany: "DE", Italy: "IT", Brazil: "BR", "United Arab Emirates": "AE",
  "South Korea": "KR", "Republic of Korea": "KR", Ukraine: "UA", Poland: "PL",
  Mexico: "MX", Israel: "IL", "Saudi Arabia": "SA", Nigeria: "NG", Colombia: "CO",
  Spain: "ES", Argentina: "AR", Netherlands: "NL", Belgium: "BE", Austria: "AT",
}

function flag(name: string) {
  const code = ISO[name]
  if (!code) return "🌍"
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}

export default function Mooneto() {
  const [thread, setThread] = useState<Array<{ q: string; a?: Answer; error?: string }>>([])
  const [latest, setLatest] = useState<Answer | null>(null)
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit(question: string) {
    if (!question.trim() || busy) return
    setBusy(true)
    setInput("")
    const turn = thread.length
    setThread((t) => [...t, { q: question }])

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "request failed")
      setThread((t) => t.map((x, i) => (i === turn ? { ...x, a: data } : x)))
      setLatest(data)
    } catch (err: any) {
      setThread((t) => t.map((x, i) => (i === turn ? { ...x, error: err.message } : x)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="stars" />
      <div className={`grid${busy ? " busy" : ""}`}>
        <section className="chat">
          <header>
            <h1>🌙 Mooneto</h1>
            <p>
              Space law, sourced. It tells you what is <em>settled</em>, what is{" "}
              <em>disputed</em>, and where it is written.
            </p>
          </header>

          <div className="thread">
            {thread.length === 0 && (
              <div className="hint">
                <p>Try asking</p>
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="suggest" onClick={() => submit(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {thread.map((turn, i) => (
              <div key={i}>
                <div className="q">{turn.q}</div>
                {turn.error && <div className="a err">⚠ {turn.error}</div>}
                {turn.a && (
                  <div className="a">
                    <p className="lead">{turn.a.verdict}</p>
                    {turn.a.claims.map((c, j) => (
                      <div className="claim" key={j}>
                        <span className={`tag ${c.label}`}>{c.label}</span>
                        <p>{c.text}</p>
                        {c.why && <p className="why">{c.why}</p>}
                        {c.sources.length > 0 && (
                          <div className="src">
                            {c.sources.map((s, k) => (
                              <a key={k} href={s.url} target="_blank" rel="noreferrer">
                                {new URL(s.url).hostname.replace("www.", "")}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && <div className="a">Consulting treaties…</div>}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit(input)
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about doing business in space…"
            />
            <button type="submit" disabled={busy}>
              Ask
            </button>
          </form>
        </section>

        <section className="stage">
          <div className="moon" />

          {latest && (
            <div className={`verdict ${latest.tone}`}>{latest.verdict}</div>
          )}

          {latest && latest.laws.length > 0 && (
            <div className="laws">
              {latest.laws.map((law, i) => (
                <div className="law" key={law} style={{ animationDelay: `${i * 90}ms` }}>
                  <span className="ico">📜</span>
                  <span className="name">{law}</span>
                </div>
              ))}
            </div>
          )}

          {latest && latest.countries.length > 0 && (
            <div className="flags">
              {latest.countries.map((c, i) => (
                <div
                  className={`flag ${c.stance}`}
                  key={c.name}
                  title={c.why}
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <span className="em">{flag(c.name)}</span>
                  <span>{c.name}</span>
                  <span className="st">{c.stance}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  )
}
