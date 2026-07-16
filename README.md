# Sandlab

WebGPU falling-sand simulator. ~700k cells, runs from a link, no install.

**Live: https://sandlab.piousangel.workers.dev**

## Deploy — Cloudflare Workers only. Not Vercel.

```bash
pnpm run deploy    # next build && wrangler deploy
```

> `pnpm deploy` (no `run`) fails — it collides with pnpm's built-in workspace command.

**Vercel does not work for this project and never will.** It serves the static sim
but every gallery call 404s:

| | Vercel | Cloudflare |
|---|---|---|
| `/` (sim) | 200 | 200 |
| `/gallery` | 200 (shell only) | 200 |
| `/api/scenes` | **404** | 200 |

Two structural reasons:
1. `worker/index.ts` is a Cloudflare Worker. Vercel doesn't know the file exists.
2. Gallery data lives in **D1**, which is Cloudflare-only.

Porting to Vercel means rewriting the API as Route Handlers *and* replacing D1 with
another database — building the same thing twice and keeping two copies in sync.
A half-working deploy is worse than none: someone clicks it, hits Publish, gets a 404,
and leaves.

## Architecture

- **Sim** (`src/lib/sand/shader.ts`) — Margolus neighborhood (2×2 blocks, origin
  alternates each tick). Falling sand is not trivially parallel: two cells racing for
  the same empty cell duplicate or destroy mass. Margolus gives one thread sole
  ownership of a block, so races are structurally impossible. No locks, no atomics.
  Verified: `node scripts/verify-margolus.mjs` (7/7 — mass conservation, density
  stratification, no left/right bias).
- **Materials are a table, not code** (`materials.ts`) — `{color, density, movement,
  lifetime, emissive, reactions[]}`. The shader only does lookups. This exists so a
  local LLM can fill the table from natural language (pre-verified: qwen2.5:1.5b,
  986MB, best-of-5 92%). Not implemented yet.
- **Bloom** — separable Gaussian at *grid* resolution, not fragment box-sampling.
  O(W·H·2r) instead of O(canvasPixels·r²), so canvas size doesn't blow it up.
- **Sharing** — RLE + deflate + base64url in the URL hash (`#g=`), server-free.
  Measured (`node scripts/verify-url.mjs`): typical scene 4,760 chars OK;
  heavy scenes exceed the 6,000 budget. That's why the gallery exists — `#s=<id>`
  has no size limit.
- **Gallery** (`worker/index.ts` + D1) — upload / browse / vote / hot (7-day window,
  a Powder Toy Front Page replica) / new. **No comments — that's a decision, not an
  omission.** Sandspiel's author removed them deliberately to keep toxicity out.
  Verified: `python3 scripts/verify-gallery.py` (17/17, needs `wrangler dev --port 8799`).

## Dev

```bash
pnpm dev                              # port 3120 — sim only, NO gallery API
npx wrangler dev --port 8799 --local  # port 8799 — full app + API. Use this one.
```

`pnpm dev` alone will make Publish/Gallery look broken. They 404 because the API is
the Worker, and the Worker only runs under wrangler.
