# Public deployment

Mooneto is deployed as its own Vercel project from this repository:

- Vercel project: `zapaias-projects/mooneto`
- Canonical project URL: https://mooneto.vercel.app/mooneto
- Public demo URL: https://www.ramirozapaia.com/mooneto

The public domain remains owned by the portfolio project (`Zapaia/v0-resume-ramirozapaia`). Its `next.config.mjs` proxies `/mooneto` and every nested path to the standalone Mooneto deployment. Mooneto's source, corpus and assets remain in `Zapaia/Hackaton`.

## Production configuration

Production variables are stored in Vercel, not in Git:

- `CALA_API_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `FAL_KEY`
- `NEXT_PUBLIC_BASE_PATH=/mooneto`
- `NEXT_PUBLIC_MIN_THINKING_MS=0`
- `NEXT_PUBLIC_MIN_SCENE_MS=0`

`NEXT_PUBLIC_BASE_PATH` is empty for local root development and `/mooneto` in Production. The app prefixes its manual API calls with the same value so the browser stays inside the proxy path.

## Verification

The following checks passed after deployment:

- `GET https://www.ramirozapaia.com/mooneto` → `200`, title `Mooneto — space law, sourced`.
- A generated CSS asset under `/mooneto/_next/static/...` → `200`.
- `POST https://www.ramirozapaia.com/mooneto/api/ask` with `Can I own a plot of land on the Moon?` → `200`, 3 settled claims, and a claim citing `Moon Agreement`.

The portfolio rewrite was published in commit `0a6c5f0`; the Mooneto subpath support is in `3af67e3`, and the secure Next.js patch is in `8716106`.
