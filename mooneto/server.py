"""Mooneto server. Stdlib only - no install step, nothing to break during a live demo."""
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from mooneto import cala, classify

WEB = Path(__file__).resolve().parent.parent / "web"
TYPES = {".html": "text/html", ".js": "text/javascript",
         ".css": "text/css", ".svg": "image/svg+xml",
         ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp"}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"  {fmt % args}")

    def _send(self, code, body, ctype="application/json"):
        if isinstance(body, (dict, list)):
            body = json.dumps(body).encode()
        elif isinstance(body, str):
            body = body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        rel = self.path.split("?")[0].lstrip("/") or "index.html"
        path = (WEB / rel).resolve()
        if not str(path).startswith(str(WEB)) or not path.is_file():
            return self._send(404, {"error": "not found"})
        self._send(200, path.read_bytes(), TYPES.get(path.suffix, "application/octet-stream"))

    def do_POST(self):
        if self.path != "/api/ask":
            return self._send(404, {"error": "not found"})
        try:
            n = int(self.headers.get("Content-Length", 0))
            question = json.loads(self.rfile.read(n)).get("question", "").strip()
            if not question:
                return self._send(400, {"error": "question is required"})

            print(f"\n> {question}")
            found = cala.ask(question)
            print(f"  cala: {len(found['claims'])} claims, "
                  f"{len(found['countries'])} countries, {len(found['laws'])} laws")

            verdict = classify.classify(question, found["claims"], found["countries"])
            result = classify.merge(found, verdict)
            print(f"  verdict: {result['verdict'][:80]}")
            self._send(200, result)
        except Exception as exc:
            print(f"  ERROR {type(exc).__name__}: {exc}")
            self._send(500, {"error": str(exc)})


def main():
    port = int(os.environ.get("PORT", 8000))
    print(f"Mooneto on http://localhost:{port}")
    ThreadingHTTPServer(("", port), Handler).serve_forever()


if __name__ == "__main__":
    main()
