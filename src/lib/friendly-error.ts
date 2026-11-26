/** Turns raw errors (Convex, fetch, validation) into short, human messages. */
export function friendlyError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : String(error ?? "");
  const message = raw.replace(/\[Request ID:[^\]]*\]/g, "").trim();

  if (/InvalidAccountId/i.test(message)) return "No account for that email yet. Create one first.";
  if (/InvalidSecret|Invalid credentials|incorrect (email|password)|wrong password/i.test(message)) return "That email and password do not match.";
  if (/already exists/i.test(message)) return "That email already has an account.";
  if (/TooMany|rate.?limit/i.test(message)) return "Too many attempts. Try again in a few minutes.";
  if (/at least 8|password requirements/i.test(message)) return "Use a password of at least 8 characters.";
  if (/verification code|that code|invalid code|expired/i.test(message)) return "That code is not valid. Request a new one.";
  if (/not authenticated|unauthorized|sign in to continue|not signed in/i.test(message)) return "Please sign in again to continue.";
  if (/permission|not allowed|forbidden/i.test(message)) return "You do not have permission to do that.";
  if (/network|offline|failed to fetch|load failed|connection/i.test(message)) return "Connection lost. Check your internet and try again.";
  if (/timeout|timed out/i.test(message)) return "That took too long. Please try again.";
  if (/not found/i.test(message)) return "We could not find that. It may have been removed.";
  if (/required|cannot be empty|invalid|expected|validation/i.test(message)) return "Some details do not look right. Check them and try again.";
  if (/server error|called by client|uncaught|internal error|Error:/i.test(message)) return "Something went wrong on our side. Please try again.";

  // Short plain-English messages from our own code are safe to show as-is.
  if (
    message.length <= 140 &&
    /^[A-Z][A-Za-z0-9 .,!?'’"’-]*$/.test(message) &&
    !/^(Cannot|TypeError|ReferenceError|SyntaxError)/.test(message)
  ) {
    return message;
  }
  return "Something went wrong. Please try again.";
}
