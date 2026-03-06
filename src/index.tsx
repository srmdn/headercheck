import { Hono } from "hono";
import { parseHeaders, type Category, type ParsedHeader } from "./headers";

const app = new Hono();

const EXAMPLE = `HTTP/2 200
content-type: text/html; charset=utf-8
cache-control: max-age=3600, public
strict-transport-security: max-age=31536000; includeSubDomains
x-content-type-options: nosniff
x-frame-options: DENY
referrer-policy: strict-origin-when-cross-origin
content-encoding: gzip
vary: Accept-Encoding
server: nginx`;

const CATEGORY_STYLES: Record<Category, string> = {
  security: "bg-red-50 text-red-700 border-red-200",
  caching: "bg-blue-50 text-blue-700 border-blue-200",
  content: "bg-green-50 text-green-700 border-green-200",
  cors: "bg-purple-50 text-purple-700 border-purple-200",
  connection: "bg-slate-100 text-slate-600 border-slate-200",
  custom: "bg-amber-50 text-amber-700 border-amber-200",
};

function Layout({ children, title }: { children: any; title?: string }) {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title ? `${title} — headercheck` : "headercheck"}</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-white text-slate-900 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}

function CategoryBadge({ category }: { category: Category }) {
  return (
    <span class={`text-xs font-semibold px-2 py-0.5 rounded border capitalize ${CATEGORY_STYLES[category]}`}>
      {category}
    </span>
  );
}

function HeaderRow({ h }: { h: ParsedHeader }) {
  return (
    <div class="py-4 border-b border-slate-100 last:border-0 grid grid-cols-1 gap-2">
      <div class="flex items-center gap-2 flex-wrap">
        <code class="font-mono text-sm font-semibold text-slate-800">{h.label}</code>
        <CategoryBadge category={h.category} />
      </div>
      <code class="font-mono text-xs text-indigo-700 bg-indigo-50 px-2 py-1 rounded w-fit max-w-full break-all">
        {h.value}
      </code>
      {h.insight && (
        <p class="text-sm text-slate-700 font-medium">{h.insight}</p>
      )}
      <p class="text-sm text-slate-500 leading-relaxed">{h.description}</p>
    </div>
  );
}

app.get("/", (c) => {
  const raw = c.req.query("h") ?? "";
  const result = raw ? parseHeaders(raw) : null;

  return c.html(
    <Layout title={result ? "Headers" : undefined}>
      <div class="max-w-2xl mx-auto px-4 py-12">
        <div class="mb-8">
          <h1 class="text-2xl font-bold tracking-tight">headercheck</h1>
          <p class="text-slate-500 mt-1 text-sm">
            Paste any HTTP response headers — get each one explained.
          </p>
        </div>

        <form method="GET" action="/" class="space-y-3 mb-8">
          <textarea
            name="h"
            rows={8}
            spellcheck="false"
            placeholder={"Paste headers here...\n\nHTTP/2 200\ncontent-type: text/html\ncache-control: max-age=3600"}
            class="w-full font-mono bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-400 resize-none"
          >
            {raw}
          </textarea>
          <div class="flex items-center gap-3">
            <button
              type="submit"
              class="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              Explain
            </button>
            {!raw && (
              <a
                href={`/?h=${encodeURIComponent(EXAMPLE)}`}
                class="text-sm text-slate-500 hover:text-slate-700 underline"
              >
                Try an example
              </a>
            )}
          </div>
        </form>

        {result && (
          <div class="space-y-4">
            {/* Status line */}
            {result.status && (
              <div class="flex items-center gap-2">
                <code class="font-mono text-sm bg-slate-900 text-emerald-400 px-3 py-1.5 rounded-lg">
                  {result.status}
                </code>
              </div>
            )}

            {result.headers.length === 0 && (
              <p class="text-sm text-slate-400">No recognizable headers found.</p>
            )}

            {/* Category summary */}
            {result.headers.length > 0 && (() => {
              const cats = [...new Set(result.headers.map((h) => h.category))];
              return (
                <div class="flex flex-wrap gap-1.5">
                  {cats.map((cat) => {
                    const count = result.headers.filter((h) => h.category === cat).length;
                    return (
                      <span class={`text-xs px-2 py-0.5 rounded border ${CATEGORY_STYLES[cat]}`}>
                        {count} {cat}
                      </span>
                    );
                  })}
                </div>
              );
            })()}

            {/* Headers */}
            <div class="rounded-lg border border-slate-200 px-4 divide-y divide-slate-100">
              {result.headers.map((h) => <HeaderRow h={h} />)}
            </div>
          </div>
        )}

        <footer class="mt-16 pt-6 border-t border-slate-100">
          <p class="text-xs text-slate-400">
            Made by{" "}
            <a href="https://github.com/srmdn" class="underline hover:text-slate-600">
              srmdn
            </a>
            .
          </p>
        </footer>
      </div>
    </Layout>
  );
});

export default {
  port: 3000,
  fetch: app.fetch,
};
