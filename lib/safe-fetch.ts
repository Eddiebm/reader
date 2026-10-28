import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { isIP, type LookupFunction } from "node:net";

/**
 * Fetching a URL a visitor pasted, without letting it reach places it
 * shouldn't: only http(s) on the standard ports, and the host (or every
 * address its name resolves to) must be public — no localhost, private,
 * link-local or cloud-metadata address. Redirects are followed one hop at a
 * time and each hop is checked again, since a public page can redirect
 * anywhere.
 *
 * The check that counts happens when the socket connects: the request is
 * made with a lookup that refuses blocked addresses, so a DNS server can't
 * pass the check with a public answer and then hand the connection 127.0.0.1.
 */

const MAX_REDIRECTS = 5;
const MAX_BODY_BYTES = 5_000_000;

function ipv4Blocked(ip: string): boolean {
  const [a, b, c] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local, cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 0) || // IETF special-purpose
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
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.+$/, ""); // "localhost." is localhost to DNS
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

/** A socket lookup that only ever hands back public addresses. */
function checkedLookup(resolve: Lookup): LookupFunction {
  return (hostname, options, callback) => {
    resolve(hostname).then(
      (records) => {
        if (!records.length || records.some((r) => isBlockedAddress(r.address))) {
          return callback(new BlockedUrlError("That address can't be fetched."), "", 0);
        }
        const addresses = records.map((r) => ({ address: r.address, family: isIP(r.address) }));
        if (options.all) return (callback as unknown as (err: null, all: typeof addresses) => void)(null, addresses);
        callback(null, addresses[0].address, addresses[0].family);
      },
      (err: NodeJS.ErrnoException) => callback(err, "", 0),
    );
  };
}

/** One GET, connected through checkedLookup, without following redirects. */
function getOnce(url: URL, init: { headers?: Record<string, string>; signal?: AbortSignal }, resolve: Lookup): Promise<Response> {
  const client = url.protocol === "https:" ? https : http;
  return new Promise((done, fail) => {
    const req = client.get(url, { headers: init.headers, signal: init.signal, lookup: checkedLookup(resolve) }, (res) => {
      const chunks: Buffer[] = [];
      let size = 0;
      res.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) res.destroy(new Error("That page is too large."));
        else chunks.push(chunk);
      });
      res.on("error", fail);
      res.on("end", () => {
        const status = res.statusCode ?? 502;
        const headers = new Headers();
        for (const [name, value] of Object.entries(res.headers)) {
          if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
        }
        const body = [204, 205, 304].includes(status) ? null : Buffer.concat(chunks);
        done(new Response(body, { status, headers }));
      });
    });
    req.on("error", fail);
  });
}

/** GET a visitor-supplied URL, following redirects one checked hop at a time. */
export async function fetchPublicUrl(
  raw: string,
  init: { headers?: Record<string, string>; signal?: AbortSignal },
  resolve: Lookup = systemLookup,
): Promise<Response> {
  let url = await publicUrl(raw, undefined, resolve);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!url) throw new BlockedUrlError("That address can't be fetched.");
    const res = await getOnce(url, init, resolve);
    const location = res.headers.get("location");
    if (res.status < 300 || res.status >= 400 || !location) return res;
    url = await publicUrl(location, url.toString(), resolve);
  }
  throw new BlockedUrlError("Too many redirects.");
}
