export type ReadChunk = {
  idx: number;
  text: string;
};

export type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

export type ClaudeAction =
  | { action: "NAVIGATE"; direction: "back" | "find"; count?: number; query?: string; response: string }
  | { action: "RESUME"; response: string }
  | { action: "RESPOND"; response: string };
