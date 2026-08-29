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
  return answer ? depictsMiningText(`${answer.question} ${answer.resolved ?? ""}`) : false
}

function depictsMiningText(text: string) {
  return /\b(min(e|ing)|extract(ion|ed|ing)?|resources?)\b/i.test(text)
}

type FieldStar = { left: string; top: string; size: number; delay: number }
type RoutePoint = { left: number; top: number }

const ROUTE_SLOTS: RoutePoint[] = [
  { left: 12, top: 24 }, { left: 32, top: 8 }, { left: 57, top: 8 },
  { left: 82, top: 24 }, { left: 91, top: 57 }, { left: 73, top: 87 },
  { left: 43, top: 92 }, { left: 17, top: 76 }, { left: 8, top: 52 },
]

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

function makeRoutePoints(field: FieldStar[], count: number): RoutePoint[] {
  let hash = field.reduce((value, star) => value ^ Math.round(parseFloat(star.left) * 97 + parseFloat(star.top) * 193), 23) >>> 0
  const next = () => {
    hash = (hash * 1664525 + 1013904223) >>> 0
    return hash / 4294967296
  }
  const slots = ROUTE_SLOTS.map((slot) => ({ ...slot }))
  for (let i = slots.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1))
    ;[slots[i], slots[j]] = [slots[j], slots[i]]
  }
  return slots.slice(0, Math.min(count, slots.length))
}

function routePath(points: RoutePoint[]) {
  const route = [{ left: 50, top: 50 }, ...points.flatMap((point) => [point, { left: 50, top: 50 }])]
  return route.map((point, i) => `${i === 0 ? "M" : "L"} ${point.left} ${point.top}`).join(" ")
}

function routeTarget(step: number, points: RoutePoint[]): RoutePoint {
  if (step < 1 || points.length === 0) return { left: 50, top: 50 }
  const point = points[Math.min(points.length - 1, Math.floor((step - 1) / 2))]
  return step % 2 === 1 ? point : { left: 50, top: 50 }
}

function MoonMark({ mining = false }: { mining?: boolean }) {
  return (
    <div className="moon">
      {MOON_CRATERS.map((crater, i) => <span className="crater" key={i} style={{ left: crater.left, top: crater.top, width: crater.size, height: crater.size }} />)}
      {mining && <span className="moon-rover" aria-hidden="true"><i /><i /><b /></span>}
    </div>
  )
}

function RocketMark() {
  return (
    <svg className="rocket-mark" viewBox="0 0 28 28" aria-hidden="true">
      <path d="M18.9 3.3c-4.2.3-7.7 2.7-9.8 6.1l-2.8.4a1.4 1.4 0 0 0-.9.5l-1.7 2.1 4.4 1.3 2.2 2.2 1.3 4.4 2.1-1.7c.3-.2.5-.6.5-.9l.4-2.8c3.4-2.1 5.8-5.6 6.1-9.8l-1.8-1.8Z" fill="currentColor" />
      <circle cx="16.8" cy="9.7" r="1.9" fill="var(--bg)" />
      <path d="M8.2 17.1c-1.3.1-2.5.7-3.4 1.6-.7.7-.9 1.6-.8 2.5.9.1 1.8-.2 2.5-.8.9-.9 1.5-2.1 1.7-3.3ZM10.9 19.8c-.1 1.3-.7 2.5-1.6 3.4-.7.7-1.6.9-2.5.8-.1-.9.2-1.8.8-2.5.9-.9 2.1-1.5 3.3-1.7Z" fill="currentColor" opacity=".75" />
    </svg>
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
  const [thinkingMs, setThinkingMs] = useState(0)
  const [starField, setStarField] = useState<FieldStar[]>(() => makeStarField("mooneto"))
  const [journeyStep, setJourneyStep] = useState(0)
  const bottom = useRef<HTMLDivElement>(null)
  const thinkingStarted = useRef(0)
  const miningScene = depictsMining(latest) || depictsMiningText(activeQuestion)
  const routeCount = latest?.laws.length ?? (exploring ? 6 : 0)
  const routePoints = makeRoutePoints(starField, routeCount)
  const currentTarget = routeTarget(journeyStep, routePoints)

  useEffect(() => {
    if (!exploring) return
    const ticker = window.setInterval(() => setThinkingMs(Date.now() - thinkingStarted.current), 100)
    return () => window.clearInterval(ticker)
  }, [exploring])

  useEffect(() => {
    if (routeCount === 0) {
      setJourneyStep(0)
      return
    }
    setJourneyStep(0)
    const maxStep = routeCount * 2
    const timer = window.setInterval(() => {
      setJourneyStep((step) => exploring ? (step >= maxStep ? 0 : step + 1) : Math.min(step + 1, maxStep))
    }, exploring ? 900 : 1000)
    return () => window.clearInterval(timer)
  }, [exploring, latest?.question, routeCount])

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" })
  }, [thread, busy])

  async function submit(question: string) {
    if (!question.trim() || busy) return
    setBusy(true)
    setShowChat(false)
    setActiveQuestion(question.trim())
    setShowReport(false)
    setExploring(true)
    thinkingStarted.current = Date.now()
    setThinkingMs(0)
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

        <section className="stage" aria-busy={busy}>
          {!showChat && <button className="chat-toggle" type="button" onClick={() => setShowChat(true)} aria-expanded={showChat}>
            <span>＋</span> Ask a question
          </button>}
          {showChat && <form className="ask-inline" onSubmit={(event) => { event.preventDefault(); submit(input) }}>
            <input autoFocus value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about space law…" aria-label="Space law question" />
            <button type="submit" disabled={busy}>Ask</button>
            <button className="ask-cancel" type="button" onClick={() => setShowChat(false)} aria-label="Close question input">×</button>
          </form>}
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
              {latest && !exploring && <div className={`answer-card ${latest.tone}`} aria-live="polite"><span>agent answer</span><p>{latest.verdict}</p></div>}
            </div>
          )}

          {exploring && (
            <div className="exploration" aria-live="polite">
              <div className="exploration-orbit">
                <span className="orbit-ring" />
                <svg className="journey-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d={routePath(routePoints)} /></svg>
                {routePoints.map((point, i) => <span className="scout-star" key={i} style={{ left: `${point.left}%`, top: `${point.top}%`, animationDelay: `${i * 160}ms` }}>✦</span>)}
                <div className="exploration-moon"><MoonMark mining={miningScene} /></div>
                <span className="journey-rocket" style={{ left: `${currentTarget.left}%`, top: `${currentTarget.top}%` }}><RocketMark /></span>
              </div>
              <div className="exploration-caption" role="status"><span className="live-dot" /> <span>Tracing the legal constellation</span><time>{(thinkingMs / 1000).toFixed(1)}s</time></div>
            </div>
          )}

          {!exploring && !latest && <div className="base-visual" aria-label="Space law knowledge base">
            <div className="base-orbit"><span className="base-core">SPACE<br />LAW</span>{["✦", "·", "✧", "·", "✦", "·"].map((mark, i) => <span className="base-star" key={i} style={{ animationDelay: `${i * 240}ms` }}>{mark}</span>)}</div>
            <div className="base-copy">
              <p className="base-title">Navigate the legal constellation</p>
              <p className="base-hint">Ask about a mission, a resource, or a jurisdiction.</p>
              <div className="base-suggestions" aria-label="Example questions">
                {SUGGESTIONS.slice(0, 2).map((suggestion) => <button key={suggestion} type="button" onClick={() => submit(suggestion)}>{suggestion}</button>)}
              </div>
            </div>
          </div>}

          {!exploring && latest && <div className="journey" aria-label="Agent journey through the legal instruments">
            <div className="journey-moon"><MoonMark mining={miningScene} /><span className="origin-label">the Moon</span></div>
            <div className="law-orbit">
              <span className="orbit-ring" />
              <svg className="journey-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d={routePath(routePoints)} /></svg>
              {latest.laws.map((law, i) => {
                const position = routePoints[i] ?? { left: 50, top: 50 }
                const visited = journeyStep >= i * 2 + 1
                return <div className={`law-star${visited ? " visited" : ""}`} key={law} style={{ left: `${position.left}%`, top: `${position.top}%`, animationDelay: `${i * 180}ms` }}><span>✦</span><small>{law}</small></div>
              })}
              <span className="journey-rocket" style={{ left: `${currentTarget.left}%`, top: `${currentTarget.top}%` }}><RocketMark /></span>
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
