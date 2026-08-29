"""Classify each Cala claim as settled / disputed / unsupported, and resolve country stances."""
import os
import json
import urllib.request

MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

SYSTEM = """You are a space-law analyst. You never invent law.

For each numbered claim you receive, assign exactly one label:

- "settled": backed by a widely ratified treaty or an unambiguous statute, with no
  serious dissent among spacefaring states.
- "disputed": states or scholars genuinely disagree, OR a treaty is silent/ambiguous
  on the point, OR the governing instrument lacks broad ratification.
- "unsupported": the claim carries no source, or the source does not establish it.

Also, for every country named in the material, give its stance on the specific
activity the user asked about:
  "enables"  - its national law or signed position permits it
  "rejects"  - it opposes that reading
  "unclear"  - named but position not established by the material

Return ONLY JSON:
{"claims":[{"index":0,"label":"settled","why":"<max 12 words>"}],
 "countries":[{"name":"United States","stance":"enables","why":"<max 12 words>"}],
 "verdict":"<one sentence, plain language, answering the user's question>"}"""


class ClassifyError(RuntimeError):
    pass


def _chat(messages: list) -> dict:
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        raise ClassifyError("OPENAI_API_KEY is not set")
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps({
            "model": MODEL,
            "messages": messages,
            "response_format": {"type": "json_object"},
            "temperature": 0,
        }).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as r:
        body = json.loads(r.read())
    return json.loads(body["choices"][0]["message"]["content"])


def classify(question: str, claims: list, countries: list) -> dict:
    numbered = "\n".join(f"[{i}] {c['text']}" for i, c in enumerate(claims))
    unsourced = [i for i, c in enumerate(claims) if not c["sources"]]
    user = (
        f"Question: {question}\n\n"
        f"Claims:\n{numbered}\n\n"
        f"Countries named: {', '.join(countries) or 'none'}\n"
        f"Claims with no source attached: {unsourced or 'none'}"
    )
    return _chat([{"role": "system", "content": SYSTEM},
                  {"role": "user", "content": user}])


def merge(cala: dict, verdict: dict) -> dict:
    """Attach labels back onto the claims and countries."""
    labels = {c["index"]: c for c in verdict.get("claims", [])}
    claims = []
    for i, c in enumerate(cala["claims"]):
        lab = labels.get(i, {})
        claims.append({**c,
                       "label": lab.get("label", "unsupported"),
                       "why": lab.get("why", "")})
    return {
        "question": cala["question"],
        "verdict": verdict.get("verdict", ""),
        "claims": claims,
        "countries": verdict.get("countries", []),
        "laws": cala["laws"],
    }
