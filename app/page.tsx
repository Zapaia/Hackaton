"use client"

import { useEffect, useRef, useState } from "react"

type Source = { name: string; url: string }
type Provision = { law: string; officialTitle?: string; year?: number; text: string }
type Claim = {
  text: string
  sources: Source[]
  label: "settled" | "disputed" | "unsupported"
  why: string
  provision?: Provision | null
}
type Country = { name: string; stance: "enables" | "rejects" | "unclear"; why: string }
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
  tone: "no" | "yes" | "split"
  claims: Claim[]
  countries: Country[]
  laws: string[]
}

const SUGGESTIONS = [
  "Can I own a plot of land on the Moon?",
  "But can I keep the resources I extract there?",
  "Build me the business case for a lunar mining company",
]

const TONE_LABEL: Record<Answer["tone"], string> = {
  no: "Prohibited",
  yes: "Permitted",
  split: "Depends on jurisdiction",
}

const ISO: Record<string, string> = {
  "United States": "US", "United States of America": "US", "Russian Federation": "RU",
  Russia: "RU", China: "CN", Luxembourg: "LU", Japan: "JP", Australia: "AU",
  Canada: "CA", "New Zealand": "NZ", "United Kingdom": "GB", India: "IN",
  France: "FR", Germany: "DE", Italy: "IT", Brazil: "BR", "United Arab Emirates": "AE",
  "South Korea": "KR", "Republic of Korea": "KR", Ukraine: "UA", Poland: "PL",
  Mexico: "MX", Israel: "IL", "Saudi Arabia": "SA", Nigeria: "NG", Colombia: "CO",
  Spain: "ES", Argentina: "AR", Netherlands: "NL", Belgium: "BE", Austria: "AT",
  Chile: "CL", Philippines: "PH", Peru: "PE", Morocco: "MA", Kazakhstan: "KZ",
}

function flag(name: string) {
  const code = ISO[name]
  if (!code) return "\u{1F30D}"
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}

function MoonMark() {
  return (
    <svg className="mark" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" className="mark-body" />
      <circle cx="9" cy="9.5" r="2" className="mark-crater" />
      <circle cx="14.5" cy="13" r="2.8" className="mark-crater" />
      <circle cx="10.5" cy="16" r="1.4" className="mark-crater" />
    </svg>
  )
}

export default function Mooneto() {
  const [thread, setThread] = useState<Array<{ q: string; a?: Answer; error?: string }>>([])
  const [latest, setLatest] = useState<Answer | null>(null)
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [activeQuestion, setActiveQuestion] = useState("")
  const [elapsed, setElapsed] = useState(0)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoBusy, setVideoBusy] = useState(false)
  const startedAt = useRef(0)
  const requestId = useRef(0)

  const evidence = latest?.laws
    .map((law) => {
      const grounded = latest.claims.filter((claim) => claim.provision?.law === law)
      return { law, provision: grounded[0]?.provision ?? null, count: grounded.length }
    })
    .filter((entry) => entry.provision) ?? []

  const stanceOrder = { enables: 0, rejects: 1, unclear: 2 } as const
  const countries = latest
    ? [...latest.countries].sort((a, b) => stanceOrder[a.stance] - stanceOrder[b.stance])
    : []
  const enables = countries.filter((c) => c.stance === "enables").length
  const rejects = countries.filter((c) => c.stance === "rejects").length

  useEffect(() => {
    if (!busy) return
    const ticker = window.setInterval(() => setElapsed(Date.now() - startedAt.current), 100)
    return () => window.clearInterval(ticker)
  }, [busy])

  async function submit(question: string) {
    const asked = question.trim()
    if (!asked || busy) return

    const id = ++requestId.current
    setBusy(true)
    setActiveQuestion(asked)
    setLatest(null)
    setVideoUrl(null)
    setVideoBusy(true)
    setInput("")
    startedAt.current = Date.now()
    setElapsed(0)

    const turn = thread.length
    setThread((t) => [...t, { q: asked }])

    // The scene is generated alongside the answer, never in front of it. The legal
    // reading lands as soon as it is ready; the animation drops into the stage that was
    // already holding its place.
    fetch("/api/video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: asked }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (id !== requestId.current) return
        if (data.url) setVideoUrl(data.url)
      })
      .catch(() => {})
      .finally(() => {
        if (id === requestId.current) setVideoBusy(false)
      })

    try {
      // Cala answers each question in isolation, so a follow-up carries the thread and is
      // rewritten server-side into something that stands alone.
      const history = thread.flatMap((t) => (t.a ? [`Q: ${t.q}`, `A: ${t.a.verdict}`] : []))
      // The case file so far: a memo has to reason over everything already established.
      const answered = thread.flatMap((t) => (t.a ? [t.a] : []))
      const gathered = {
        countries: answered.flatMap((a) => a.countries),
        laws: [...new Set(answered.flatMap((a) => a.laws))],
      }

      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: asked, history, gathered }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "request failed")
      if (id !== requestId.current) return
      setThread((t) => t.map((x, i) => (i === turn ? { ...x, a: data } : x)))
      setLatest(data)
    } catch (error: any) {
      if (id !== requestId.current) return
      setThread((t) => t.map((x, i) => (i === turn ? { ...x, error: error.message } : x)))
    } finally {
      if (id === requestId.current) setBusy(false)
    }
  }

  const showingQuestion = activeQuestion || latest?.question
  const failed = thread[thread.length - 1]?.error

  return (
    <div className={`page${showingQuestion ? "" : " page-opening"}`}>
      <header className="masthead">
        <div className="wordmark">
          <MoonMark />
          <span>Mooneto</span>
        </div>
        <p className="tagline">
          Space law, sourced. What is <em>settled</em>, what is <em>disputed</em>,
          and where it is written.
        </p>
      </header>

      <form
        className="ask"
        onSubmit={(event) => {
          event.preventDefault()
          submit(input)
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about doing business in space"
          aria-label="Space law question"
        />
        <button type="submit" disabled={busy}>
          {busy ? "Consulting" : "Ask"}
        </button>
      </form>

      {!showingQuestion && (
        <section className="opening">
          <p className="thesis">
            You can never own lunar land. Whether you can own what you{" "}
            <em>extract</em> from it depends on where your company is registered.
          </p>
          <div className="openers">
            {SUGGESTIONS.map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => submit(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>
        </section>
      )}

      {showingQuestion && (
        <main className="answer">
          <section className={`stage${videoUrl ? " has-scene" : ""}`}>
            {videoUrl ? (
              <video
                key={videoUrl}
                className="scene"
                src={videoUrl}
                autoPlay
                muted
                loop
                playsInline
                aria-label="Illustrative animation of the activity in question"
              />
            ) : (
              <div className="scene-pending" role="status">
                <span className="pulse" aria-hidden="true" />
                <span>{videoBusy ? "Drawing the scene" : "No scene for this question"}</span>
              </div>
            )}

            <div className="stage-copy">
              <p className="asked">{showingQuestion}</p>

              {busy && (
                <p className="working" role="status">
                  Reading the treaties
                  <time>{(elapsed / 1000).toFixed(1)}s</time>
                </p>
              )}

              {failed && !busy && <p className="failed">{failed}</p>}

              {latest && !busy && (
                <>
                  <p className={`tone ${latest.tone}`}>{TONE_LABEL[latest.tone]}</p>
                  <p className="verdict">{latest.verdict}</p>
                  {latest.resolved && latest.resolved !== latest.question && (
                    <p className="reading">Read as “{latest.resolved}”</p>
                  )}
                </>
              )}
            </div>
          </section>

          {latest && !busy && (
            <div className="columns">
              <section className="law">
                <h2>The law behind this</h2>
                {evidence.length === 0 ? (
                  <p className="none">
                    No articulated provision in the corpus supports this reading, so nothing
                    here is presented as settled.
                  </p>
                ) : (
                  evidence.map(({ law, provision, count }) => (
                    <article key={law} className="instrument">
                      <h3>
                        {law}
                        {provision?.year ? <span className="year">{provision.year}</span> : null}
                      </h3>
                      <blockquote>{provision?.text}</blockquote>
                      <p className="grounds">
                        {count} {count === 1 ? "claim rests" : "claims rest"} on this provision
                      </p>
                    </article>
                  ))
                )}

                {latest.plan && (
                  <div className="memo">
                    <h2>Recommended route</h2>
                    <ol>
                      {latest.plan.route.map((step, i) => (
                        <li key={i}>
                          {step.step}
                          <span className="basis">{step.basis}</span>
                        </li>
                      ))}
                    </ol>

                    <h2>Open risks</h2>
                    <ul className="risks">
                      {latest.plan.risks.map((risk, i) => (
                        <li key={i}>
                          {risk.risk}
                          <span className="basis">Changes if: {risk.trigger}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              <aside className="positions">
                <h2>Who reads it how</h2>
                {countries.length === 0 ? (
                  <p className="none">No state position established by the sources.</p>
                ) : (
                  <>
                    <p className="split">
                      <span className="enables">{enables} allow</span>
                      <span className="rejects">{rejects} reject</span>
                    </p>
                    <ul className="states">
                      {countries.map((country) => (
                        <li key={country.name} className={country.stance}>
                          <span className="flag" aria-hidden="true">{flag(country.name)}</span>
                          <span className="name">{country.name}</span>
                          <span className="why">{country.why}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {latest.plan && (
                  <div className="confidence">
                    <h2>Legal confidence</h2>
                    <dl>
                      <dt>Ratification</dt>
                      <dd>{latest.plan.confidence.ratification}</dd>
                      <dt>National law</dt>
                      <dd>{latest.plan.confidence.nationalLaw}</dd>
                      <dt>Dissent</dt>
                      <dd>{latest.plan.confidence.dissent}</dd>
                    </dl>
                  </div>
                )}
              </aside>
            </div>
          )}

          {latest && !busy && (
            <section className="followups">
              {SUGGESTIONS.filter((s) => s !== latest.question).map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => submit(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </section>
          )}
        </main>
      )}
    </div>
  )
}
