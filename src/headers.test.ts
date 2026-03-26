import { describe, it, expect } from "bun:test";
import { parseHeaders } from "./headers";

describe("parseHeaders", () => {
  it("returns empty headers for empty input", () => {
    const result = parseHeaders("");
    expect(result.headers).toHaveLength(0);
    expect(result.status).toBeUndefined();
  });

  it("parses a status line", () => {
    const result = parseHeaders("HTTP/1.1 200 OK\ncontent-type: text/html");
    expect(result.status).toBe("HTTP/1.1 200 OK");
  });

  it("parses a single known header", () => {
    const result = parseHeaders("content-type: application/json; charset=utf-8");
    expect(result.headers).toHaveLength(1);
    const h = result.headers[0];
    expect(h.name).toBe("content-type");
    expect(h.value).toBe("application/json; charset=utf-8");
    expect(h.category).toBe("content");
    expect(h.label).toBe("Content-Type");
  });

  it("parses multiple headers", () => {
    const input = [
      "cache-control: max-age=3600, public",
      "content-encoding: gzip",
      "x-frame-options: DENY",
    ].join("\n");
    const result = parseHeaders(input);
    expect(result.headers).toHaveLength(3);
  });

  it("generates insight for cache-control", () => {
    const result = parseHeaders("cache-control: max-age=3600, public");
    const h = result.headers[0];
    expect(h.insight).toBeTruthy();
    expect(h.insight).toContain("1h");
    expect(h.insight).toContain("CDN");
  });

  it("generates insight for strict-transport-security", () => {
    const result = parseHeaders("strict-transport-security: max-age=31536000; includeSubDomains; preload");
    const h = result.headers[0];
    expect(h.insight).toBeTruthy();
    expect(h.insight).toContain("preload");
    expect(h.insight).toContain("subdomains");
  });

  it("generates insight for x-frame-options DENY", () => {
    const result = parseHeaders("x-frame-options: DENY");
    const h = result.headers[0];
    expect(h.insight).toContain("clickjacking");
  });

  it("generates insight for access-control-allow-origin wildcard", () => {
    const result = parseHeaders("access-control-allow-origin: *");
    const h = result.headers[0];
    expect(h.insight).toContain("credentials");
  });

  it("assigns 'custom' category to unknown headers", () => {
    const result = parseHeaders("x-my-custom-header: somevalue");
    const h = result.headers[0];
    expect(h.category).toBe("custom");
  });

  it("assigns correct categories to known headers", () => {
    const cases = [
      ["strict-transport-security: max-age=31536000", "security"],
      ["cache-control: no-cache", "caching"],
      ["content-type: text/html", "content"],
      ["access-control-allow-origin: *", "cors"],
      ["connection: keep-alive", "connection"],
    ] as const;
    for (const [header, expectedCategory] of cases) {
      const result = parseHeaders(header);
      expect(result.headers[0].category).toBe(expectedCategory);
    }
  });

  it("skips lines without a colon", () => {
    const result = parseHeaders("not-a-valid-header-line\ncontent-type: text/html");
    expect(result.headers).toHaveLength(1);
  });

  it("handles CRLF line endings", () => {
    const result = parseHeaders("content-type: text/html\r\ncache-control: no-cache");
    expect(result.headers).toHaveLength(2);
  });
});
