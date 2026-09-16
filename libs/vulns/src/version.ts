const VERSION_SEGMENT_RE = /(\d+|[a-zA-Z]+)/g;

export function parseVersion(version: string): Array<number | string> {
  const segments: Array<number | string> = [];
  const matches = (version || "").match(VERSION_SEGMENT_RE);
  if (!matches) return segments;

  for (const match of matches) {
    const num = parseInt(match, 10);
    segments.push(Number.isNaN(num) ? match.toLowerCase() : num);
  }

  while (
    segments.length >= 2 &&
    typeof segments[segments.length - 2] === "string" &&
    typeof segments[segments.length - 1] === "number"
  ) {
    segments.pop();
    segments.pop();
  }
  if (segments.length > 0 && typeof segments[segments.length - 1] === "string") {
    segments.pop();
  }

  return segments;
}

function compareSegment(a: number | string, b: number | string): number {
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  if (typeof a === "string" && typeof b === "string") {
    return a.localeCompare(b);
  }
  return typeof a === "number" ? -1 : 1;
}

export function compareVersions(a: string, b: string): number {
  const aParts = parseVersion(a);
  const bParts = parseVersion(b);
  const len = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < len; i++) {
    const pa = aParts[i] ?? 0;
    const pb = bParts[i] ?? 0;
    const cmp = compareSegment(pa, pb);
    if (cmp !== 0) return cmp < 0 ? -1 : 1;
  }
  return 0;
}

export type VersionOperator = "lt" | "lte" | "eq" | "gt" | "gte";

export function matchesVersion(actual: string, operator: VersionOperator, expected?: string): boolean {
  if (!expected) return operator === "eq";
  const cmp = compareVersions(actual, expected);

  switch (operator) {
    case "lt":
      return cmp < 0;
    case "lte":
      return cmp <= 0;
    case "eq":
      return cmp === 0;
    case "gt":
      return cmp > 0;
    case "gte":
      return cmp >= 0;
    default:
      return false;
  }
}

export function stripPatchSuffix(version: string): string {
  if (!version) return version;
  return version.replace(/[a-zA-Z]\d*$/, "");
}

export function extractVersionFromBanner(banner: string, prefix?: string): string | null {
  if (!banner) return null;

  let raw = banner.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).join(" ");

  if (prefix) {
    const idx = raw.toLowerCase().indexOf(prefix.toLowerCase());
    if (idx >= 0) {
      raw = raw.slice(idx + prefix.length);
    }
  }

  const re = /([vV])?(\d+(?:\.\d+){1,4}(?:[a-zA-Z][\w.+-]*)?)/g;
  const matches = Array.from(raw.matchAll(re));
  if (matches.length === 0) return null;

  const last = matches[matches.length - 1];
  return stripPatchSuffix(last[2]);
}

export function normalizeProduct(input: string): string {
  if (!input) return "";
  return input.toLowerCase().trim();
}

export function parseSshBanner(banner: string): { name: string; version?: string } | null {
  const line = (banner || "").split(/\r?\n/)[0]?.trim();
  if (!line) return null;

  const match = line.match(/^SSH-\d+(?:\.\d+)?-(.+)$/i);
  if (!match) return null;

  const product = match[1];
  const versionMatch = product.split(/\s+/)[0].match(/([\w-]+?)[_-]?([\d][\w.+-]*)$/i);
  if (versionMatch) {
    const name = versionMatch[1].replace(/[_-]+$/g, "");
    return { name: normalizeProduct(name), version: stripPatchSuffix(versionMatch[2]) };
  }
  return { name: normalizeProduct(product) };
}

export function parseHttpServer(serverHeader: string): { name: string; version?: string } | null {
  if (!serverHeader) return null;
  const header = serverHeader.trim();
  if (header.startsWith("(")) {
    const match = header.match(/^\(([^)]*)\)\s*(.+)$/);
    if (match) {
      const os = match[1];
      const product = match[2];
      const versionMatch = product.match(/([\w.-]+?)[/]?([\d][\w.+-]*)?/i);
      return {
        name: normalizeProduct(versionMatch?.[1] || product),
        version: versionMatch?.[2],
      };
    }
  }

  const parts = header.split(/\s+/);
  for (const part of parts) {
    const slashIdx = part.indexOf("/");
    if (slashIdx > 0) {
      const name = part.slice(0, slashIdx);
      const version = part.slice(slashIdx + 1);
      if (/^\d/.test(version)) {
        return { name: normalizeProduct(name), version };
      }
    }
  }
  return { name: normalizeProduct(parts[0] || header) };
}

export function parseTelnetBanner(banner: string): { name: string; version?: string } | null {
  const raw = (banner || "").trim();
  if (!raw) return null;

  const versionMatch = raw.match(/([\w.-]+)\/([\d][\w.+-]*)/i);
  if (versionMatch) {
    return { name: normalizeProduct(versionMatch[1]), version: versionMatch[2] };
  }
  return { name: normalizeProduct(raw.split(/\s+/)[0]) };
}