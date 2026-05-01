const MAX_CHARS = 180;

function splitLongSentence(sentence: string): string[] {
  const s = sentence.trim();
  if (s.length <= MAX_CHARS) return s ? [s] : [];

  const parts: string[] = [];
  let remaining = s;

  while (remaining.length > MAX_CHARS) {
    const window = remaining.slice(0, MAX_CHARS);
    const commaIdx = window.lastIndexOf(",");
    if (commaIdx > Math.floor(MAX_CHARS * 0.25)) {
      const chunk = remaining.slice(0, commaIdx + 1).trim();
      if (chunk) parts.push(chunk);
      remaining = remaining.slice(commaIdx + 1).trim();
      continue;
    }

    const spaceIdx = window.lastIndexOf(" ");
    if (spaceIdx > 0) {
      const chunk = remaining.slice(0, spaceIdx).trim();
      if (chunk) parts.push(chunk);
      remaining = remaining.slice(spaceIdx + 1).trim();
      continue;
    }

    parts.push(remaining.slice(0, MAX_CHARS));
    remaining = remaining.slice(MAX_CHARS).trim();
  }

  if (remaining) parts.push(remaining);
  return parts;
}

function splitIntoSentences(block: string): string[] {
  const normalized = block.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const sentences: string[] = [];
  const re = /[^.!?]+(?:[.!?]+|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(normalized)) !== null) {
    const piece = m[0].trim();
    if (piece) sentences.push(piece);
  }

  return sentences.length ? sentences : [normalized];
}

/**
 * Paragraph-aware chunking: split on blank lines first, then sentences,
 * then commas / word boundaries so no chunk exceeds MAX_CHARS or splits mid-word without a boundary.
 */
export function chunkText(raw: string): string[] {
  const paras = raw
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n+/g, " ").trim())
    .filter(Boolean);

  const blocks = paras.length ? paras : [raw.replace(/\n+/g, " ").trim()].filter(Boolean);

  const out: string[] = [];
  for (const block of blocks) {
    for (const sentence of splitIntoSentences(block)) {
      out.push(...splitLongSentence(sentence));
    }
  }
  return out;
}
