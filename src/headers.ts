export type Category = "security" | "caching" | "content" | "cors" | "connection" | "custom";

export interface ParsedHeader {
  name: string;
  value: string;
  label: string;
  category: Category;
  description: string;
  insight?: string;
}

export interface ParseResult {
  status?: string;
  headers: ParsedHeader[];
}

function humanDuration(seconds: number): string {
  if (seconds === 0) return "0 seconds";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} months`;
  return `${Math.floor(seconds / 31536000)} years`;
}

function explainCacheControl(value: string): string {
  const parts: string[] = [];
  for (const d of value.split(",").map((s) => s.trim().toLowerCase())) {
    if (d === "no-store") parts.push("Never cached");
    else if (d === "no-cache") parts.push("Must revalidate before use");
    else if (d === "public") parts.push("Cacheable by CDNs and proxies");
    else if (d === "private") parts.push("Browser-only cache, not CDN");
    else if (d === "immutable") parts.push("Content never changes — skip revalidation");
    else if (d === "must-revalidate") parts.push("Stale cache must revalidate with server");
    else if (d === "stale-while-revalidate") parts.push("Serve stale while refreshing in background");
    else if (d.startsWith("max-age=")) parts.push(`Browser: ${humanDuration(+d.split("=")[1])}`);
    else if (d.startsWith("s-maxage=")) parts.push(`Shared caches: ${humanDuration(+d.split("=")[1])}`);
    else if (d.startsWith("stale-while-revalidate=")) parts.push(`Background refresh window: ${humanDuration(+d.split("=")[1])}`);
  }
  return parts.join(" · ");
}

function explainHSTS(value: string): string {
  const parts: string[] = [];
  const m = value.match(/max-age=(\d+)/i);
  if (m) parts.push(`HTTPS enforced for ${humanDuration(+m[1])}`);
  if (/includesubdomains/i.test(value)) parts.push("Applies to all subdomains");
  if (/preload/i.test(value)) parts.push("Eligible for browser HSTS preload list");
  return parts.join(" · ");
}

function explainContentType(value: string): string {
  const [mime, ...params] = value.split(";").map((s) => s.trim());
  const charset = params.find((p) => p.startsWith("charset="))?.split("=")[1];
  const mimeLabels: Record<string, string> = {
    "text/html": "HTML document",
    "text/plain": "Plain text",
    "text/css": "CSS stylesheet",
    "text/javascript": "JavaScript",
    "application/json": "JSON data",
    "application/xml": "XML data",
    "application/pdf": "PDF document",
    "application/octet-stream": "Binary data (generic download)",
    "image/png": "PNG image",
    "image/jpeg": "JPEG image",
    "image/svg+xml": "SVG image",
    "image/webp": "WebP image",
    "font/woff2": "WOFF2 font",
    "multipart/form-data": "Form upload with files",
    "application/x-www-form-urlencoded": "URL-encoded form data",
  };
  const label = mimeLabels[mime] ?? mime;
  return charset ? `${label} · encoded as ${charset.toUpperCase()}` : label;
}

function explainXFrameOptions(value: string): string {
  const v = value.toUpperCase();
  if (v === "DENY") return "Cannot be embedded in any iframe — strong clickjacking protection";
  if (v.startsWith("SAMEORIGIN")) return "Can only be embedded by pages on the same origin";
  if (v.startsWith("ALLOW-FROM")) return `Can only be embedded by: ${value.split(" ")[1]}`;
  return value;
}

function explainACAllowOrigin(value: string): string {
  if (value === "*") return "Any origin allowed — do not use with credentials";
  if (value === "null") return 'Null origin — often unsafe, reflects from sandboxed frames';
  return `Only this origin is allowed: ${value}`;
}

function explainContentEncoding(value: string): string {
  const labels: Record<string, string> = {
    gzip: "Compressed with gzip — widely supported",
    br: "Compressed with Brotli — better compression than gzip, modern browsers only",
    deflate: "Compressed with deflate",
    identity: "No compression applied",
    zstd: "Compressed with Zstandard — very fast decompression",
  };
  return labels[value.toLowerCase()] ?? value;
}

function explainReferrerPolicy(value: string): string {
  const labels: Record<string, string> = {
    "no-referrer": "Never send referrer header",
    "no-referrer-when-downgrade": "Send full URL except on HTTPS → HTTP",
    "origin": "Send only the origin (no path)",
    "origin-when-cross-origin": "Full URL for same-origin, origin only for cross-origin",
    "same-origin": "Send referrer only to same-origin requests",
    "strict-origin": "Send origin only, never on downgrade",
    "strict-origin-when-cross-origin": "Recommended default — origin for cross-origin, full for same",
    "unsafe-url": "Always send full URL including path and query",
  };
  return labels[value.toLowerCase()] ?? value;
}

function explainContentDisposition(value: string): string {
  if (value.toLowerCase().startsWith("attachment")) {
    const m = value.match(/filename[^;=\n]*=([^;\n]*)/i);
    return m ? `Triggers download as: ${m[1].replace(/['"]/g, "").trim()}` : "Triggers a file download";
  }
  if (value.toLowerCase().startsWith("inline")) return "Displayed in the browser, not downloaded";
  return value;
}

interface HeaderDef {
  label: string;
  category: Category;
  description: string;
  explain?: (value: string) => string;
}

const HEADER_DB: Record<string, HeaderDef> = {
  // Security
  "strict-transport-security": {
    label: "Strict-Transport-Security",
    category: "security",
    description: "Forces browsers to use HTTPS for future requests. One of the most important security headers.",
    explain: explainHSTS,
  },
  "content-security-policy": {
    label: "Content-Security-Policy",
    category: "security",
    description: "Restricts which resources (scripts, styles, images, etc.) the browser is allowed to load. Prevents XSS attacks.",
  },
  "x-content-type-options": {
    label: "X-Content-Type-Options",
    category: "security",
    description: "When set to `nosniff`, prevents the browser from guessing the content type. Stops MIME-sniffing attacks.",
  },
  "x-frame-options": {
    label: "X-Frame-Options",
    category: "security",
    description: "Controls whether the page can be embedded in an iframe. Defends against clickjacking. Superseded by CSP `frame-ancestors`.",
    explain: explainXFrameOptions,
  },
  "x-xss-protection": {
    label: "X-XSS-Protection",
    category: "security",
    description: "Legacy XSS filter for older browsers. Mostly obsolete — modern browsers use CSP instead. Setting to `0` can actually be safer.",
  },
  "referrer-policy": {
    label: "Referrer-Policy",
    category: "security",
    description: "Controls how much referrer information is sent with requests. Protects user privacy and internal URL structure.",
    explain: explainReferrerPolicy,
  },
  "permissions-policy": {
    label: "Permissions-Policy",
    category: "security",
    description: "Restricts which browser features (camera, microphone, geolocation, etc.) can be used by the page or embedded frames.",
  },
  "cross-origin-opener-policy": {
    label: "Cross-Origin-Opener-Policy",
    category: "security",
    description: "Isolates the browsing context from cross-origin documents. Required for `SharedArrayBuffer` and `performance.measureUserAgentSpecificMemory()`.",
  },
  "cross-origin-embedder-policy": {
    label: "Cross-Origin-Embedder-Policy",
    category: "security",
    description: "Prevents loading cross-origin resources that don't explicitly grant permission. Required alongside COOP for full isolation.",
  },
  "cross-origin-resource-policy": {
    label: "Cross-Origin-Resource-Policy",
    category: "security",
    description: "Restricts which origins can load this resource. Helps prevent cross-site leaks.",
  },
  // Caching
  "cache-control": {
    label: "Cache-Control",
    category: "caching",
    description: "The primary mechanism for controlling how and how long responses are cached by browsers, CDNs, and proxies.",
    explain: explainCacheControl,
  },
  "etag": {
    label: "ETag",
    category: "caching",
    description: "A unique identifier for the current version of a resource. Browsers send it back via `If-None-Match` to check for updates without re-downloading.",
  },
  "last-modified": {
    label: "Last-Modified",
    category: "caching",
    description: "Timestamp of when the resource last changed. Browsers use it with `If-Modified-Since` for conditional requests.",
  },
  "expires": {
    label: "Expires",
    category: "caching",
    description: "Legacy cache expiry date. Superseded by `Cache-Control: max-age`. If both are present, Cache-Control takes precedence.",
  },
  "age": {
    label: "Age",
    category: "caching",
    description: "How long (in seconds) the response has been in a shared cache. Helps diagnose CDN cache hits.",
    explain: (v) => `Served from cache ${humanDuration(+v)} ago`,
  },
  "pragma": {
    label: "Pragma",
    category: "caching",
    description: "HTTP/1.0 legacy header. `Pragma: no-cache` is equivalent to `Cache-Control: no-cache`. Kept for backward compatibility.",
  },
  // Content
  "content-type": {
    label: "Content-Type",
    category: "content",
    description: "Declares the media type and character encoding of the response body. Critical for correct parsing by the browser.",
    explain: explainContentType,
  },
  "content-length": {
    label: "Content-Length",
    category: "content",
    description: "The size of the response body in bytes. Allows the client to know when the response is fully received.",
    explain: (v) => {
      const bytes = +v;
      if (bytes < 1024) return `${bytes} bytes`;
      if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / 1048576).toFixed(2)} MB`;
    },
  },
  "content-encoding": {
    label: "Content-Encoding",
    category: "content",
    description: "The compression algorithm applied to the response body. The browser decompresses automatically before rendering.",
    explain: explainContentEncoding,
  },
  "content-disposition": {
    label: "Content-Disposition",
    category: "content",
    description: "Indicates whether the response should be displayed inline or downloaded as a file attachment.",
    explain: explainContentDisposition,
  },
  "content-language": {
    label: "Content-Language",
    category: "content",
    description: "The natural language(s) of the intended audience for the response.",
  },
  // CORS
  "access-control-allow-origin": {
    label: "Access-Control-Allow-Origin",
    category: "cors",
    description: "Tells browsers which origin(s) are allowed to read the response in cross-origin requests.",
    explain: explainACAllowOrigin,
  },
  "access-control-allow-methods": {
    label: "Access-Control-Allow-Methods",
    category: "cors",
    description: "Lists the HTTP methods allowed for cross-origin requests. Returned in response to preflight OPTIONS requests.",
  },
  "access-control-allow-headers": {
    label: "Access-Control-Allow-Headers",
    category: "cors",
    description: "Lists the request headers that can be used in cross-origin requests.",
  },
  "access-control-allow-credentials": {
    label: "Access-Control-Allow-Credentials",
    category: "cors",
    description: "When `true`, allows cross-origin requests to include cookies, authorization headers, or TLS client certificates.",
  },
  "access-control-max-age": {
    label: "Access-Control-Max-Age",
    category: "cors",
    description: "How long the result of a preflight request can be cached, avoiding repeated OPTIONS requests.",
    explain: (v) => `Preflight result cached for ${humanDuration(+v)}`,
  },
  "access-control-expose-headers": {
    label: "Access-Control-Expose-Headers",
    category: "cors",
    description: "Lists which response headers can be accessed by browser JavaScript in cross-origin requests.",
  },
  // Connection
  "connection": {
    label: "Connection",
    category: "connection",
    description: "Controls whether the network connection stays open after the current request. `keep-alive` reuses the connection.",
  },
  "transfer-encoding": {
    label: "Transfer-Encoding",
    category: "connection",
    description: "Specifies the encoding used to transfer the body. `chunked` means the response is sent in pieces without a known total size.",
  },
  "vary": {
    label: "Vary",
    category: "connection",
    description: "Tells caches which request headers affect the response. Different header values get separate cached copies.",
  },
  "date": {
    label: "Date",
    category: "connection",
    description: "The date and time the server generated the response. Used to calculate the age of cached responses.",
  },
  "server": {
    label: "Server",
    category: "connection",
    description: "Identifies the server software. Often intentionally vague or removed for security reasons — detailed version info helps attackers.",
  },
  "x-powered-by": {
    label: "X-Powered-By",
    category: "connection",
    description: "Non-standard header identifying the backend framework (e.g. Express, PHP). Should be removed in production — exposes your tech stack.",
  },
  "via": {
    label: "Via",
    category: "connection",
    description: "Added by proxies and CDNs to track the request path. Useful for debugging routing and caching issues.",
  },
  "location": {
    label: "Location",
    category: "connection",
    description: "Used with 3xx redirects or 201 Created responses. Tells the client where to go next.",
  },
};

export function parseHeaders(input: string): ParseResult {
  const lines = input.trim().split(/\r?\n/).filter((l) => l.trim());
  let status: string | undefined;
  const headers: ParsedHeader[] = [];

  for (const line of lines) {
    // Status line
    if (/^HTTP\/\d/.test(line)) {
      status = line.trim();
      continue;
    }

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const name = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();
    if (!name || !value) continue;

    const def = HEADER_DB[name];
    const insight = def?.explain?.(value);

    headers.push({
      name,
      value,
      label: def?.label ?? toTitleCase(name),
      category: def?.category ?? "custom",
      description: def?.description ?? "Non-standard or custom header.",
      insight,
    });
  }

  return { status, headers };
}

function toTitleCase(name: string): string {
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("-");
}
