/** Result of a form server action: `{ error }` is shown as a toast by ActionForm, `null` = ok. */
export type ActionState = { error?: string } | null;

/** Shown when an action throws something unexpected (Next hides the real message in production). */
export const UNEXPECTED_ERROR = "Terjadi kesalahan. Coba lagi.";

/** The control-flow error a server action's `redirect()` rejects with on the client. */
export const isRedirect = (e: unknown) =>
  typeof e === "object" && e !== null && typeof (e as { digest?: unknown }).digest === "string" && (e as { digest: string }).digest.startsWith("NEXT_REDIRECT");
