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

/**
 * What the agent is actually doing, in order, while you wait.
 *
 * These are not filler: each line names a real step of the pipeline — the question is
 * rewritten, Cala is searched, the opposing position is sought on purpose, the articles
 * are pulled, and only then is anything called settled. A loading state is the one place
 * a user will happily read how a system works.
 */
const WORKING_STEPS = [
  "Reading your question",
  "Charting a course through the archive",
  "Searching the treaty record",
  "Asking who disagrees",
  "Pulling the articles themselves",
  "Separating settled law from open debate",
  "Counting who signed and who refused",
  "Drawing the scene",
]

/**
 * Presentation only: hold the thinking state for at least this long.
 *
 * A warmed answer returns in milliseconds, which is great in the room and useless on
 * camera — the whole route animation and the pipeline steps flash past. Setting this for
 * a recording lets that beat play. Leave it at zero for a live demo, or every answer pays
 * the delay for nothing.
 */
const MIN_THINKING_MS = Number(process.env.NEXT_PUBLIC_MIN_THINKING_MS ?? 0)

/**
 * The scene lands before the verdict, never at the same moment.
 *
 * A cached video pops in instantly and then the viewer waits, which reads as if nothing
 * is happening. Holding the scene to a shorter beat than the answer gives the sequence a
 * shape: the route runs, the scene arrives, then the law lands on top of it.
 */
const MIN_SCENE_MS = Number(process.env.NEXT_PUBLIC_MIN_SCENE_MS ?? 0)

// Manual fetches and public assets do not receive Next's basePath automatically.
// This stays empty locally and becomes /mooneto in the portfolio proxy deployment.
const APP_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ""
const appPath = (path: string) => `${APP_BASE_PATH}${path}`

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

/**
 * A dev-server reload, a cold route or a proxy hiccup answers with an HTML page, and
 * calling .json() on that surfaces a parser message to the user. Read the response
 * defensively and fail with words a person can act on.
 */
async function readJson(response: Response) {
  const body = await response.text()
  try {
    const parsed = JSON.parse(body)
    if (!response.ok) throw new Error(parsed.error ?? `Request failed (${response.status})`)
    return parsed
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      throw new Error("The service did not answer properly. Ask again.")
    }
    throw error
  }
}

type FieldStar = { left: string; top: string; size: number; delay: number }
type RoutePoint = { left: number; top: number }

const MOON_CRATERS = [
  { left: "20%", top: "25%", size: 16 }, { left: "59%", top: "20%", size: 26 },
  { left: "72%", top: "46%", size: 12 }, { left: "37%", top: "57%", size: 21 },
  { left: "22%", top: "69%", size: 10 }, { left: "67%", top: "75%", size: 17 },
]

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
  return Array.from({ length: 34 }, () => ({
    left: `${Math.round(next() * 100)}%`,
    top: `${Math.round(next() * 100)}%`,
    size: 1 + Math.round(next() * 2),
    delay: Math.round(next() * 2200),
  }))
}

function makeRoutePoints(field: FieldStar[], count: number): RoutePoint[] {
  let hash = field.reduce(
    (value, star) =>
      value ^ Math.round(parseFloat(star.left) * 97 + parseFloat(star.top) * 193),
    23
  ) >>> 0
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
  const route = [
    { left: 50, top: 50 },
    ...points.flatMap((point) => [point, { left: 50, top: 50 }]),
  ]
  return route.map((p, i) => `${i === 0 ? "M" : "L"} ${p.left} ${p.top}`).join(" ")
}

function routeTarget(step: number, points: RoutePoint[]): RoutePoint {
  if (step < 1 || points.length === 0) return { left: 50, top: 50 }
  const point = points[Math.min(points.length - 1, Math.floor((step - 1) / 2))]
  return step % 2 === 1 ? point : { left: 50, top: 50 }
}

function MoonBody() {
  return (
    <div className="moon-body">
      {MOON_CRATERS.map((crater, i) => (
        <span
          key={i}
          className="crater"
          style={{ left: crater.left, top: crater.top, width: crater.size, height: crater.size }}
        />
      ))}
    </div>
  )
}

function RocketMark() {
  return (
    <svg className="rocket-mark" viewBox="0 0 28 28" aria-hidden="true">
      <path d="M18.9 3.3c-4.2.3-7.7 2.7-9.8 6.1l-2.8.4a1.4 1.4 0 0 0-.9.5l-1.7 2.1 4.4 1.3 2.2 2.2 1.3 4.4 2.1-1.7c.3-.2.5-.6.5-.9l.4-2.8c3.4-2.1 5.8-5.6 6.1-9.8l-1.8-1.8Z" fill="currentColor" />
      <circle cx="16.8" cy="9.7" r="1.9" fill="var(--sunken)" />
      <path d="M8.2 17.1c-1.3.1-2.5.7-3.4 1.6-.7.7-.9 1.6-.8 2.5.9.1 1.8-.2 2.5-.8.9-.9 1.5-2.1 1.7-3.3ZM10.9 19.8c-.1 1.3-.7 2.5-1.6 3.4-.7.7-1.6.9-2.5.8-.1-.9.2-1.8.8-2.5.9-.9 2.1-1.5 3.3-1.7Z" fill="currentColor" opacity=".75" />
    </svg>
  )
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
  const [step, setStep] = useState(0)
  const [starField, setStarField] = useState<FieldStar[]>(() => makeStarField("mooneto"))
  const [journeyStep, setJourneyStep] = useState(0)
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
    // Advance through the steps and hold on the last one rather than looping, so a long
    // wait never claims the agent went back to the beginning.
    const stepper = window.setInterval(
      () => setStep((current) => Math.min(current + 1, WORKING_STEPS.length - 1)),
      1900
    )
    // The scout flies out to an instrument and back, once per leg.
    const flight = window.setInterval(() => setJourneyStep((n) => n + 1), 900)
    return () => {
      window.clearInterval(ticker)
      window.clearInterval(stepper)
      window.clearInterval(flight)
    }
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
    setStep(0)
    setJourneyStep(0)
    setStarField(makeStarField(`${asked}:${Date.now()}`))

    const turn = thread.length
    setThread((t) => [...t, { q: asked }])

    // The scene is generated alongside the answer, never in front of it. The legal
    // reading lands as soon as it is ready; the animation drops into the stage that was
    // already holding its place.
    fetch(appPath("/api/video"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: asked }),
    })
      .then(readJson)
      .then(async (data) => {
        const held = MIN_SCENE_MS - (Date.now() - startedAt.current)
        if (held > 0) await new Promise((resolve) => setTimeout(resolve, held))
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

      const res = await fetch(appPath("/api/ask"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: asked, history, gathered }),
      })
      const data = await readJson(res)
      const held = MIN_THINKING_MS - (Date.now() - startedAt.current)
      if (held > 0) await new Promise((resolve) => setTimeout(resolve, held))
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

  const routePoints = makeRoutePoints(starField, 6)
  const target = routeTarget(journeyStep, routePoints)
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
          {/* Poses the tension without resolving it: the answers belong to the demo,
              not to the front door. */}
          <p className="thesis">
            Space law was written in <em>1967</em>. Your business plan was not.
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
                <div className="constellation" aria-hidden="true">
                  {starField.map((star, i) => (
                    <i
                      key={i}
                      className="field-star"
                      style={{
                        left: star.left, top: star.top,
                        width: star.size, height: star.size,
                        animationDelay: `${star.delay}ms`,
                      }}
                    />
                  ))}
                  <svg className="route" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d={routePath(routePoints)} />
                  </svg>
                  {routePoints.map((point, i) => (
                    <span
                      key={i}
                      className={`instrument-star${journeyStep >= i * 2 + 1 ? " reached" : ""}`}
                      style={{ left: `${point.left}%`, top: `${point.top}%` }}
                    />
                  ))}
                  <span className="scout" style={{ left: `${target.left}%`, top: `${target.top}%` }}>
                    <RocketMark />
                  </span>
                  <MoonBody />
                </div>
                <span className="scene-note">
                  {videoBusy ? "Drawing the scene" : "No scene for this question"}
                </span>
              </div>
            )}

            <div className="stage-copy">
              <p className="asked">{showingQuestion}</p>

              {busy && (
                <p className="working" role="status">
                  <span key={step} className="working-step">
                    {WORKING_STEPS[step]}
                  </span>
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
