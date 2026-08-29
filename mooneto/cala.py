"""Cala client: turns a natural-language legal question into structured claims."""
import os
import urllib.request
import json

API = "https://api.cala.ai"


class CalaError(RuntimeError):
    pass


def _post(path: str, payload: dict, timeout: int = 90) -> dict:
    key = os.environ.get("CALA_API_KEY")
    if not key:
        raise CalaError("CALA_API_KEY is not set")
    req = urllib.request.Request(
        f"{API}{path}",
        data=json.dumps(payload).encode(),
        headers={"X-API-KEY": key, "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


def _sources_for(context_by_id: dict, ref_ids: list) -> list:
    """Flatten the origins of the referenced context entries into unique sources."""
    out, seen = [], set()
    for rid in ref_ids:
        for origin in context_by_id.get(rid, {}).get("origins", []):
            doc = origin.get("document") or origin.get("source") or {}
            url = doc.get("url")
            if url and url not in seen:
                seen.add(url)
                out.append({"name": doc.get("name") or url, "url": url})
    return out


def ask(question: str) -> dict:
    """Query Cala and normalise the response into claims, countries and laws."""
    raw = _post("/v1/knowledge/search", {"input": question})
    context_by_id = {c["id"]: c for c in raw.get("context", [])}

    claims = [
        {
            "text": item["content"],
            "sources": _sources_for(context_by_id, item.get("references", [])),
        }
        for item in raw.get("explainability", [])
    ]

    entities = raw.get("entities", [])
    by_type = lambda t: [e["name"] for e in entities if e.get("entity_type") == t]

    return {
        "question": question,
        "answer": raw.get("content", ""),
        "claims": claims,
        "countries": by_type("Country"),
        "laws": by_type("Law"),
    }
