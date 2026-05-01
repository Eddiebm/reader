import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ClaudeBody = {
  documentTitle?: string;
  currentIndex?: number;
  totalChunks?: number;
  recentContext?: string;
  history?: { role: string; content: string }[];
  speech?: string;
};

function buildSystemPrompt(params: {
  documentTitle: string;
  currentIndex: number;
  totalChunks: number;
  recentContext: string;
  historyBlock: string;
  speech: string;
}) {
  const { documentTitle, currentIndex, totalChunks, recentContext, historyBlock, speech } = params;
  return `You are a reading companion for Dr. Courtney Houchen, a distinguished academic who is visually impaired. His colleague Eddie normally reads to him. You are filling that role.

The document being read: ${documentTitle}
Current position: sentence ${currentIndex} of ${totalChunks}
Recently read: ${recentContext}

CONVERSATION HISTORY:
${historyBlock}

DR. HOUCHEN JUST SAID: ${speech}

Your job is to handle whatever he needs in a single response.

If he said "go back", "repeat that", "back up", or any variant — respond with:
ACTION: NAVIGATE
DIRECTION: back
COUNT: 1 (or however many he specified)
RESPONSE: "Going back." (spoken confirmation, brief)

If he referenced specific content to find — "go back to where you said X":
ACTION: NAVIGATE
DIRECTION: find
QUERY: (the phrase or topic)
RESPONSE: "Finding that." (spoken confirmation)

If he said "continue", "keep going", "resume", "carry on":
ACTION: RESUME
RESPONSE: "Continuing."

If he asked a question or wants to discuss something — answer it directly, substantively, with the depth his expertise warrants. No bullet points. No markdown. Write for speech. End with: "Shall I continue, or is there more you want to discuss?"

ACTION: RESPOND
RESPONSE: (your full answer)

Dr. Houchen is not a patient man with machines. Be fast, be direct, be substantive. Never condescending. Never over-explain what he already knows. Match his register.`;
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 500 });
  }

  let body: ClaudeBody;
  try {
    body = (await req.json()) as ClaudeBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const documentTitle = typeof body.documentTitle === "string" ? body.documentTitle : "Untitled";
  const totalChunks = typeof body.totalChunks === "number" && body.totalChunks >= 0 ? body.totalChunks : 0;
  const currentIndex =
    typeof body.currentIndex === "number" && body.currentIndex >= 0 ? body.currentIndex + 1 : 1;
  const recentContext = typeof body.recentContext === "string" ? body.recentContext : "";
  const speech = typeof body.speech === "string" ? body.speech.trim() : "";
  if (!speech) {
    return NextResponse.json({ error: "Missing speech." }, { status: 400 });
  }

  const history = Array.isArray(body.history) ? body.history : [];
  const historyBlock = history
    .map((h) => `${h.role.toUpperCase()}: ${h.content}`)
    .join("\n")
    .slice(0, 120_000);

  const system = buildSystemPrompt({
    documentTitle,
    currentIndex,
    totalChunks,
    recentContext,
    historyBlock,
    speech,
  });

  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: "Respond now." }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err || "Anthropic API error." }, { status: res.status });
  }

  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = data.content?.map((b) => (b.type === "text" ? b.text ?? "" : "")).join("") ?? "";

  return NextResponse.json({ text });
}
