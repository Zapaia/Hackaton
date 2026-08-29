"use client"

import { useEffect, useRef, useState } from "react"

type Provision = { law: string; year?: number; text: string }
type Claim = { text: string; label: string; why: string; provision?: Provision | null }
type Country = { name: string; stance: string; why: string }
type PlanStep = { step: string; basis: string }
type PlanRisk = { risk: string; trigger: string }
type Plan = {
  verdict: string
  route: PlanStep[]
  risks: PlanRisk[]
  confidence: { ratification: string; nationalLaw: string; dissent: string }
}
type Answer = {
  question: string
  resolved?: string
  plan?: Plan
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
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" })
  }, [thread, busy])

  async function submit(question: string) {
    if (!question.trim() || busy) return
    setBusy(true)
    setInput("")
    const turn = thread.length
    setThread((t) => [...t, { q: question }])

    try {
      // Cala answers questions in isolation, so follow-ups need the thread
      // rewritten into a standalone question server-side.
      const history = thread.flatMap((t) =>
        t.a ? [`Q: ${t.q}`, `A: ${t.a.verdict}`] : []
      )
      // The case file so far. A business-case memo has to be built from everything the
      // conversation established, not just from the last question.
      const answered = thread.flatMap((t) => (t.a ? [t.a] : []))
      const gathered = {
        countries: answered.flatMap((a) => a.countries),
        laws: [...new Set(answered.flatMap((a) => a.laws))],
      }
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history, gathered }),
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
                    {turn.a.resolved && turn.a.resolved !== turn.q && (
                      <p className="resolved">interpreted as: “{turn.a.resolved}”</p>
                    )}
                    {turn.a.plan && (
                      <div className="memo">
                        <h3>Recommended route</h3>
                        <ol>
                          {turn.a.plan.route.map((r, j) => (
                            <li key={j}>
                              {r.step}
                              <span className="basis">{r.basis}</span>
                            </li>
                          ))}
                        </ol>

                        <h3>Open risks</h3>
                        <ul className="risks">
                          {turn.a.plan.risks.map((r, j) => (
                            <li key={j}>
                              {r.risk}
                              <span className="basis">changes if: {r.trigger}</span>
                            </li>
                          ))}
                        </ul>

                        <h3>Legal confidence</h3>
                        <dl className="conf">
                          <dt>Ratification</dt>
                          <dd>{turn.a.plan.confidence.ratification}</dd>
                          <dt>National law</dt>
                          <dd>{turn.a.plan.confidence.nationalLaw}</dd>
                          <dt>Major-power dissent</dt>
                          <dd>{turn.a.plan.confidence.dissent}</dd>
                        </dl>
                      </div>
                    )}
                    {!turn.a.plan && turn.a.claims.map((c, j) => (
                      <div className="claim" key={j}>
                        <span className={`tag ${c.label}`}>{c.label}</span>
                        <p>{c.text}</p>
                        {c.why && <p className="why">{c.why}</p>}
                        {c.provision && (
                          <aside className="provision" aria-label="Legal provision">
                            <span className="provision-label">Legal provision</span>
                            <p className="provision-law">
                              {c.provision.law}
                              {c.provision.year ? ` · ${c.provision.year}` : ""}
                            </p>
                            <blockquote>{c.provision.text}</blockquote>
                          </aside>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && <div className="a">Consulting treaties…</div>}
            <div ref={bottom} />
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
