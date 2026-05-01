import type { ClaudeAction } from "@/lib/types";

function responseBody(raw: string): string | undefined {
  const m = raw.match(/RESPONSE:\s*([\s\S]+)/i);
  return m?.[1]?.trim();
}

function pickLine(raw: string, key: string): string | undefined {
  const re = new RegExp(`^${key}:\\s*(.*)$`, "im");
  const m = raw.match(re);
  return m?.[1]?.trim();
}

/**
 * Parses structured lines from the Claude reply. Falls back to RESPOND with full text.
 */
export function parseClaudeAction(raw: string): ClaudeAction {
  const text = raw.trim();
  const action = pickLine(text, "ACTION")?.toUpperCase();

  if (action === "NAVIGATE") {
    const direction = (pickLine(text, "DIRECTION")?.toLowerCase() === "find" ? "find" : "back") as
      | "back"
      | "find";
    const countRaw = pickLine(text, "COUNT");
    const count = countRaw ? Math.max(1, parseInt(countRaw, 10) || 1) : 1;
    const query = pickLine(text, "QUERY");
    const response = responseBody(text) ?? "Done.";
    return { action: "NAVIGATE", direction, count, query, response };
  }

  if (action === "RESUME") {
    return { action: "RESUME", response: responseBody(text) ?? "Continuing." };
  }

  const spoken = responseBody(text);
  if (spoken) {
    return { action: "RESPOND", response: spoken };
  }

  return { action: "RESPOND", response: text };
}
