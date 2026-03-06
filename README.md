# headercheck

Paste any HTTP response headers — get each one explained in plain English.

![headercheck screenshot](screenshot.png)

## What it does

- Paste headers from curl, browser devtools, or anywhere
- Each header annotated with category (Security, Caching, Content, CORS, Connection)
- Value-specific insights (e.g. `max-age=3600` → "Browser: 1h", `gzip` → compression explained)
- Covers 35+ common headers — unknown ones labeled as custom
- Category summary at a glance

## Stack

- **Runtime** — [Bun](https://bun.sh)
- **Framework** — [Hono](https://hono.dev) with JSX SSR
- **Styling** — Tailwind CSS (CDN)

## Run locally

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## License

MIT
