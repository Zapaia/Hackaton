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

const MOON_CRATERS = [
  { left: "20%", top: "25%", size: 18 }, { left: "59%", top: "20%", size: 29 },
  { left: "72%", top: "46%", size: 13 }, { left: "37%", top: "57%", size: 23 },
  { left: "22%", top: "69%", size: 11 }, { left: "67%", top: "75%", size: 19 },
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

function depictsMining(answer: Answer | null) {
  if (!answer) return false
  return /\b(min(e|ing)|extract(ion|ed|ing)?|resources?)\b/i.test(
    `${answer.question} ${answer.resolved ?? ""}`
  )
}

type FieldStar = { left: string; top: string; size: number; delay: number }

function makeStarField(seed: string): FieldStar[] {
  let hash = [...seed].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 17)
  const next = () => {
    hash = (hash * 1664525 + 1013904223) >>> 0
    return hash / 4294967296
  }
  return Array.from({ length: 42 }, () => ({
    left: `${Math.round(next() * 100)}%`,
    top: `${Math.round(next() * 100)}%`,
    size: 1 + Math.round(next() * 2),
    delay: Math.round(next() * 2200),
  }))
}

function MoonMark({ mining = false }: { mining?: boolean }) {
  return (
    <div className="moon">
      {MOON_CRATERS.map((crater, i) => <span className="crater" key={i} style={{ left: crater.left, top: crater.top, width: crater.size, height: crater.size }} />)}
      {mining && <span className="moon-rover">▰</span>}
    </div>
  )
}

export default function Mooneto() {
  const [thread, setThread] = useState<Array<{ q: string; a?: Answer; error?: string }>>([])
  const [latest, setLatest] = useState<Answer | null>(null)
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [activeQuestion, setActiveQuestion] = useState("")
  const [exploring, setExploring] = useState(false)
  const [reasoningMs, setReasoningMs] = useState(0)
  const [thinkingMs, setThinkingMs] = useState(0)
  const [starField, setStarField] = useState<FieldStar[]>(() => makeStarField("mooneto"))
  const bottom = useRef<HTMLDivElement>(null)
  const thinkingStarted = useRef(0)
  const miningScene = depictsMining(latest)

  useEffect(() => {
    if (!exploring) return
    const ticker = window.setInterval(() => setThinkingMs(Date.now() - thinkingStarted.current), 100)
    return () => window.clearInterval(ticker)
  }, [exploring])

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" })
  }, [thread, busy])

  async function submit(question: string) {
    if (!question.trim() || busy) return
    setBusy(true)
    setActiveQuestion(question.trim())
    setShowReport(false)
    setExploring(true)
    thinkingStarted.current = Date.now()
    setThinkingMs(0)
    setReasoningMs(0)
    setStarField(makeStarField(`${question}:${Date.now()}`))
    setLatest(null)
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
      setReasoningMs(Date.now() - thinkingStarted.current)
      setExploring(false)
      setThread((t) => t.map((x, i) => (i === turn ? { ...x, a: data } : x)))
      setLatest(data)
    } catch (err: any) {
      setExploring(false)
      setThread((t) => t.map((x, i) => (i === turn ? { ...x, error: err.message } : x)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="stars" />
      <div className={`grid${busy ? " busy" : ""}`}>
        {showChat && (
          <button className="chat-scrim" aria-label="Close question panel" onClick={() => setShowChat(false)} />
        )}
        <section className={`chat${showChat ? " open" : ""}`}>
          <header>
            <div className="chat-heading">
              <h1>🌙 Mooneto</h1>
              <button className="chat-close" type="button" onClick={() => setShowChat(false)} aria-label="Close question panel">×</button>
            </div>
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
          <button className="chat-toggle" type="button" onClick={() => setShowChat(true)} aria-expanded={showChat}>
            <span>＋</span> Ask a question
          </button>
          <div className="visual-stars" aria-hidden="true">
            {starField.map((star, i) => (
              <i key={i} style={{ left: star.left, top: star.top, width: star.size, height: star.size, animationDelay: `${star.delay}ms` }} />
            ))}
          </div>

          {(activeQuestion || latest) && (
            <div className="stage-header">
              <div className="question-cluster">
                <div className="stage-question">{activeQuestion || latest?.question}</div>
                {latest && (
                  <>
                    <button className="report-toggle" type="button" onClick={() => setShowReport((open) => !open)} aria-expanded={showReport}>
                      {showReport ? "Hide agent report" : "Open agent report"} <span>{showReport ? "↑" : "↓"}</span>
                    </button>
                    {showReport && (
                      <div className="agent-report">
                        <div className="report-counts"><span>{latest.laws.length} instruments</span><span>{latest.countries.length} jurisdictions</span></div>
                        {!latest.plan && latest.claims.slice(0, 6).map((claim, i) => (
                          <div className="report-line" key={i}><span className={`tag ${claim.label}`}>{claim.label}</span><span>{claim.text}</span></div>
                        ))}
                        {latest.plan && <p className="report-note">Decision memo assembled from the accumulated case file.</p>}
                      </div>
                    )}
                  </>
                )}
              </div>
              {latest && !exploring && <div className={`answer-card ${latest.tone}`}><span>agent answer</span><p>{latest.verdict}</p></div>}
            </div>
          )}

          {exploring && (
            <div className="exploration" aria-live="polite">
              <MoonMark mining={miningScene} />
              <div className="exploration-track">
                {Array.from({ length: 6 }, (_, i) => <span className="scout-star" key={i} style={{ animationDelay: `${i * 420}ms` }}>✦</span>)}
                <span className="scout-rocket" aria-hidden="true">🚀</span>
              </div>
              <p>Tracing the legal constellation…</p>
              <small>{(thinkingMs / 1000).toFixed(1)}s</small>
            </div>
          )}

          {!exploring && !latest && <div className="base-visual" aria-label="Space law knowledge base">
            <div className="base-orbit"><span className="base-core">SPACE<br />LAW</span>{["✦", "·", "✧", "·", "✦", "·"].map((mark, i) => <span className="base-star" key={i} style={{ animationDelay: `${i * 240}ms` }}>{mark}</span>)}</div>
            <p>Ask a question to navigate the legal constellation</p>
          </div>}

          {!exploring && latest && <div className="journey" aria-label="Agent journey through the legal instruments">
            <div className="journey-moon"><MoonMark mining={miningScene} /><span className="origin-label">the Moon</span></div>
            <div className="law-orbit">
              <span className="orbit-ring" />
              {latest.laws.map((law, i) => {
                const angle = -90 + (i * 360) / Math.max(1, latest.laws.length)
                const radians = (angle * Math.PI) / 180
                return <div className="law-star" key={law} style={{ left: `${50 + Math.cos(radians) * 42}%`, top: `${50 + Math.sin(radians) * 42}%`, animationDelay: `${i * 180}ms` }}><span>✦</span><small>{law}</small></div>
              })}
              <span className="journey-rocket" style={{ animationDuration: `${Math.max(4, Math.min(12, reasoningMs / 1000))}s` }} aria-hidden="true">🚀</span>
            </div>
            <div className="return-label">route complete · evidence returned to the Moon</div>
          </div>}

          {!exploring && latest && latest.countries.length > 0 && <div className="jurisdictions" aria-label="Country positions found by the agent">
            <span className="jurisdictions-label">jurisdictions reached</span>
            <div className="flags">
              {latest.countries.map((c, i) => <div className={`flag ${c.stance}`} key={c.name} title={c.why} style={{ animationDelay: `${latest.laws.length * 180 + i * 70}ms` }}><span className="em">{flag(c.name)}</span><span>{c.name}</span><span className="st">{c.stance}</span></div>)}
            </div>
          </div>}
        </section>
      </div>
    </>
  )
}
