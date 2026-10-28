import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Fetching a URL a visitor pasted, without letting it reach places it
 * shouldn't: only http(s) on the standard ports, and the host (or every
 * address its name resolves to) must be public — no localhost, private,
 * link-local or cloud-metadata address. Redirects are followed one hop at a
 * time and each hop is checked again, since a public page can redirect
 * anywhere.
 *
 * The address is checked before the request, and fetch resolves the name
 * again when it connects, so a DNS answer that changes in between isn't
 * covered. That gap is narrow compared with fetching any URL as-is.
 */

const MAX_REDIRECTS = 5;

function ipv4Blocked(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local, cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // multicast and reserved
  );
}

function ipv6Blocked(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::" || lower === "::1") return true;
  if (/^f[cd]/.test(lower) || /^fe[89ab]/.test(lower)) return true; // unique local, link-local
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (mapped) return ipv4Blocked(mapped[1]);
  const mappedHex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(lower);
  if (mappedHex) {
    const hi = parseInt(mappedHex[1], 16);
    const lo = parseInt(mappedHex[2], 16);
    return ipv4Blocked(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }
  return false;
}

export function isBlockedAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return ipv4Blocked(ip);
  if (family === 6) return ipv6Blocked(ip);
  return true;
}

export type Lookup = (hostname: string) => Promise<Array<{ address: string }>>;
const systemLookup: Lookup = (hostname) => lookup(hostname, { all: true });

/** The URL if it may be requested, otherwise null. */
export async function publicUrl(raw: string, base?: string, resolve: Lookup = systemLookup): Promise<URL | null> {
  let url: URL;
  try {
    url = base ? new URL(raw, base) : new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (url.port && url.port !== "80" && url.port !== "443") return null;
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return null;
  // URL parsing already turns 2130706433 or 0x7f.1 into 127.0.0.1, so literals arrive dotted.
  if (isIP(host)) return isBlockedAddress(host) ? null : url;
  try {
    const records = await resolve(host);
    if (!records.length || records.some((r) => isBlockedAddress(r.address))) return null;
  } catch {
    return null;
  }
  return url;
}

export class BlockedUrlError extends Error {}

/** GET a visitor-supplied URL, following redirects one checked hop at a time. */
export async function fetchPublicUrl(
  raw: string,
  init: { headers?: Record<string, string>; signal?: AbortSignal },
  resolve: Lookup = systemLookup,
): Promise<Response> {
  let url = await publicUrl(raw, undefined, resolve);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!url) throw new BlockedUrlError("That address can't be fetched.");
    const res = await fetch(url, { headers: init.headers, signal: init.signal, redirect: "manual" });
    const location = res.headers.get("location");
    if (res.status < 300 || res.status >= 400 || !location) return res;
    url = await publicUrl(location, url.toString(), resolve);
  }
  throw new BlockedUrlError("Too many redirects.");
}
