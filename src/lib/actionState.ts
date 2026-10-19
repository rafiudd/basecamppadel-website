/** Result of a form server action: `{ error }` is shown as a toast by ActionForm, `null` = ok. */
export type ActionState = { error?: string } | null;

/**
 * For callers in a try/catch: the data of a guardResult() action, or its `{ error }` thrown as an
 * Error in the browser, where the message survives (thrown on the server, production hides it).
 */
export function unwrap<T extends { error?: string }>(res: T): Exclude<T, { error: string }> {
  if (res.error) throw new Error(res.error);
  return res as Exclude<T, { error: string }>;
}

/** Shown when an action throws something unexpected (Next hides the real message in production). */
export const UNEXPECTED_ERROR = "Terjadi kesalahan. Coba lagi.";

/** The control-flow error a server action's `redirect()` rejects with on the client. */
export const isRedirect = (e: unknown) =>
  typeof e === "object" && e !== null && typeof (e as { digest?: unknown }).digest === "string" && (e as { digest: string }).digest.startsWith("NEXT_REDIRECT");
