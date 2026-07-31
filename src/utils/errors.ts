export interface ToolErrorPayload {
  success: false;
  error: string;
  code: string;
  retryable: boolean;
  suggestion?: string;
}

export function formatToolError(err: unknown): ToolErrorPayload {
  if (err instanceof ToolError) {
    return {
      success: false,
      error: err.message,
      code: err.code,
      retryable: err.retryable,
      suggestion: err.suggestion,
    };
  }

  const message = err instanceof Error ? err.message : String(err);
  const retryable =
    message.includes("429") ||
    message.includes("503") ||
    message.includes("rate limit");

  return {
    success: false,
    error: message,
    code: "UNKNOWN_ERROR",
    retryable,
    suggestion: retryable
      ? "Wait a moment and retry the same tool call."
      : "Check tool parameters and store API credentials.",
  };
}

export class ToolError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly retryable = false,
    readonly suggestion?: string,
  ) {
    super(message);
    this.name = "ToolError";
  }
}

export function toolTextResult(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function toolErrorResult(err: unknown) {
  return toolTextResult(formatToolError(err));
}
